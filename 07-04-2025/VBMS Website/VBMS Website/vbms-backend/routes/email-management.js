const express = require('express');
const router = express.Router();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { authenticateToken } = require('../middleware/auth');
const role = require('../middleware/role');

// Master Admin Only
router.use(authenticateToken, role('main_admin'));

// Test IMAP/SMTP connection
router.post('/test-connection', async (req, res) => {
  try {
    const { email, password, imapServer, imapPort, smtpServer, smtpPort } = req.body;
    
    // Test IMAP connection
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const testImap = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.end();
          resolve(true);
        });
        
        imap.once('error', (err) => {
          reject(err);
        });
        
        imap.connect();
      });
    };

    // Test SMTP connection
    const transporter = nodemailer.createTransporter({
      host: smtpServer,
      port: smtpPort,
      secure: false,
      auth: {
        user: email,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const testSmtp = () => {
      return new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            reject(error);
          } else {
            resolve(success);
          }
        });
      });
    };

    // Test both connections
    const [imapSuccess, smtpSuccess] = await Promise.all([
      testImap(),
      testSmtp()
    ]);

    res.json({
      success: true,
      message: 'Both IMAP and SMTP connections successful',
      imap: { connected: imapSuccess },
      smtp: { connected: smtpSuccess }
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
});

// Sync emails from IMAP
router.post('/sync', async (req, res) => {
  try {
    const { email, password, imapServer, imapPort, folder = 'INBOX' } = req.body;
    
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const fetchEmails = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            const fetch = imap.seq.fetch('1:10', { bodies: '', struct: true });
            const emails = [];

            fetch.on('message', (msg, seqno) => {
              const email = {};
              
              msg.on('body', (stream, info) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) return;
                  email.subject = parsed.subject;
                  email.from = parsed.from.text;
                  email.to = parsed.to.text;
                  email.text = parsed.text;
                  email.html = parsed.html;
                  email.date = parsed.date;
                });
              });

              msg.once('attributes', (attrs) => {
                email.uid = attrs.uid;
                email.flags = attrs.flags;
                email.size = attrs.size;
              });

              msg.once('end', () => {
                emails.push(email);
              });
            });

            fetch.once('error', (err) => {
              reject(err);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      });
    };

    const emails = await fetchEmails();
    
    res.json({
      success: true,
      message: `Synced ${emails.length} emails from ${folder}`,
      emails: emails
    });

  } catch (error) {
    console.error('Email sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Email sync failed',
      error: error.message
    });
  }
});

// Get email folders
router.get('/folders', async (req, res) => {
  try {
    const { email, password, imapServer, imapPort } = req.query;
    
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const getFolders = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.getBoxes((err, boxes) => {
            if (err) {
              reject(err);
              return;
            }
            
            const folders = [];
            const processBox = (box, prefix = '') => {
              if (box.children) {
                box.children.forEach(child => {
                  processBox(child, prefix + child.name + '/');
                });
              }
              folders.push({
                name: prefix + box.name,
                path: prefix + box.name,
                delimiter: box.delimiter
              });
            };
            
            Object.values(boxes).forEach(box => processBox(box));
            imap.end();
            resolve(folders);
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      });
    };

    const folders = await getFolders();
    
    res.json({
      success: true,
      folders: folders
    });

  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folders',
      error: error.message
    });
  }
});

// Get emails from specific folder
router.get('/folder/:folderName', async (req, res) => {
  try {
    const { folderName } = req.params;
    const { email, password, imapServer, imapPort, limit = 50 } = req.query;
    
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const fetchEmails = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox(folderName, false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            const messageCount = Math.min(box.messages.total, limit);
            const fetch = imap.seq.fetch(`1:${messageCount}`, { 
              bodies: '', 
              struct: true,
              envelope: true
            });
            
            const emails = [];

            fetch.on('message', (msg, seqno) => {
              const email = {};
              
              msg.on('body', (stream, info) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) return;
                  email.subject = parsed.subject || 'No Subject';
                  email.from = parsed.from?.text || 'Unknown';
                  email.to = parsed.to?.text || 'Unknown';
                  email.text = parsed.text || '';
                  email.html = parsed.html || '';
                  email.date = parsed.date || new Date();
                });
              });

              msg.once('attributes', (attrs) => {
                email.uid = attrs.uid;
                email.flags = attrs.flags;
                email.size = attrs.size;
                email.seen = attrs.flags.includes('\\Seen');
              });

              msg.once('end', () => {
                emails.push(email);
              });
            });

            fetch.once('error', (err) => {
              reject(err);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      });
    };

    const emails = await fetchEmails();
    
    res.json({
      success: true,
      folder: folderName,
      emails: emails,
      total: emails.length
    });

  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get emails',
      error: error.message
    });
  }
});

// Send email via SMTP
router.post('/send', async (req, res) => {
  try {
    const { email, password, smtpServer, smtpPort, to, subject, text, html } = req.body;
    
    const transporter = nodemailer.createTransporter({
      host: smtpServer,
      port: smtpPort,
      secure: false,
      auth: {
        user: email,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: email,
      to: to,
      subject: subject,
      text: text,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Mark email as read/unread
router.put('/email/:emailId/read', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { email, password, imapServer, imapPort, folder, markAsRead } = req.body;
    
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const markEmail = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            const flags = markAsRead ? ['\\Seen'] : ['\\Unseen'];
            imap.setFlags([emailId], flags, (err) => {
              if (err) {
                reject(err);
                return;
              }
              imap.end();
              resolve(true);
            });
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      });
    };

    await markEmail();
    
    res.json({
      success: true,
      message: `Email marked as ${markAsRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    console.error('Mark email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark email',
      error: error.message
    });
  }
});

// Delete email
router.delete('/email/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { email, password, imapServer, imapPort, folder } = req.body;
    
    const imap = new Imap({
      user: email,
      password: password,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const deleteEmail = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            imap.move([emailId], 'Trash', (err) => {
              if (err) {
                reject(err);
                return;
              }
              imap.end();
              resolve(true);
            });
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      });
    };

    await deleteEmail();
    
    res.json({
      success: true,
      message: 'Email moved to trash successfully'
    });

  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email',
      error: error.message
    });
  }
});

module.exports = router;

