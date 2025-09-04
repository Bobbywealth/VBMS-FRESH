const express = require('express');
const router = express.Router();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// Email Management Routes - Master Admin Only
router.use(authenticateToken);
router.use(requireAdminPermission);

// Test email connection
router.post('/test-connection', async (req, res) => {
  try {
    const { emailAddress, emailPassword, imapServer, imapPort, smtpServer, smtpPort } = req.body;

    // Test IMAP connection
    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
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
    const testSmtp = async () => {
      const transporter = nodemailer.createTransporter({
        host: smtpServer,
        port: smtpPort,
        secure: smtpPort === '465',
        auth: {
          user: emailAddress,
          pass: emailPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      return await transporter.verify();
    };

    // Test both connections
    await testImap();
    await testSmtp();

    res.json({ 
      success: true, 
      message: 'Email connection test successful',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Email connection test failed:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Email connection test failed',
      error: error.message 
    });
  }
});

// Sync emails from server
router.post('/sync', async (req, res) => {
  try {
    const { emailAddress, emailPassword, imapServer, imapPort } = req.body;

    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const emails = [];

    const fetchEmails = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            // Fetch last 50 emails
            const fetch = imap.seq.fetch('1:50', {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              const email = {
                id: seqno,
                folder: 'inbox',
                unread: false,
                starred: false,
                attachments: false,
                timestamp: new Date(),
                sender: '',
                subject: '',
                preview: ''
              };

              msg.on('body', (stream, info) => {
                if (info.which === 'TEXT') {
                  simpleParser(stream, (err, parsed) => {
                    if (!err) {
                      email.preview = parsed.text ? parsed.text.substring(0, 100) + '...' : '';
                      email.attachments = parsed.attachments && parsed.attachments.length > 0;
                    }
                  });
                }
              });

              msg.once('attributes', (attrs) => {
                if (attrs.uid) {
                  email.id = attrs.uid;
                }
                if (attrs.flags) {
                  email.unread = !attrs.flags.includes('\\Seen');
                  email.starred = attrs.flags.includes('\\Flagged');
                }
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

    const syncedEmails = await fetchEmails();

    res.json({
      success: true,
      message: `Successfully synced ${syncedEmails.length} emails`,
      emails: syncedEmails,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Email sync failed:', error);
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
    const { emailAddress, emailPassword, imapServer, imapPort } = req.query;

    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
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
            const processBoxes = (boxList, prefix = '') => {
              for (const [name, box] of Object.entries(boxList)) {
                if (box.type === 'personal') {
                  folders.push({
                    name: prefix + name,
                    path: box.path,
                    count: 0
                  });
                }
                if (box.children) {
                  processBoxes(box.children, prefix + name + '/');
                }
              }
            };

            processBoxes(boxes);
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
      folders: folders,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to get folders:', error);
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
    const { emailAddress, emailPassword, imapServer, imapPort, limit = 50 } = req.query;

    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
      host: imapServer,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const getFolderEmails = () => {
      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          imap.openBox(folderName, false, (err, box) => {
            if (err) {
              reject(err);
              return;
            }

            const emails = [];
            const messageCount = Math.min(box.messages.total, parseInt(limit));
            const start = Math.max(1, box.messages.total - messageCount + 1);
            const end = box.messages.total;

            if (messageCount === 0) {
              imap.end();
              resolve(emails);
              return;
            }

            const fetch = imap.seq.fetch(`${start}:${end}`, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              const email = {
                id: seqno,
                folder: folderName,
                unread: false,
                starred: false,
                attachments: false,
                timestamp: new Date(),
                sender: '',
                subject: '',
                preview: ''
              };

              msg.on('body', (stream, info) => {
                if (info.which === 'TEXT') {
                  simpleParser(stream, (err, parsed) => {
                    if (!err) {
                      email.preview = parsed.text ? parsed.text.substring(0, 100) + '...' : '';
                      email.attachments = parsed.attachments && parsed.attachments.length > 0;
                    }
                  });
                }
              });

              msg.once('attributes', (attrs) => {
                if (attrs.uid) {
                  email.id = attrs.uid;
                }
                if (attrs.flags) {
                  email.unread = !attrs.flags.includes('\\Seen');
                  email.starred = attrs.flags.includes('\\Flagged');
                }
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

    const emails = await getFolderEmails();

    res.json({
      success: true,
      folder: folderName,
      emails: emails,
      count: emails.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to get folder emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folder emails',
      error: error.message
    });
  }
});

// Send email
router.post('/send', async (req, res) => {
  try {
    const { emailAddress, emailPassword, smtpServer, smtpPort, to, subject, text, html } = req.body;

    const transporter = nodemailer.createTransporter({
      host: smtpServer,
      port: smtpPort,
      secure: smtpPort === '465',
      auth: {
        user: emailAddress,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: emailAddress,
      to: to,
      subject: subject,
      text: text,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to send email:', error);
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
    const { emailAddress, emailPassword, imapServer, imapPort, folder, markAsRead } = req.body;

    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
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

            const flags = markAsRead ? ['\\Seen'] : ['\\Seen'];
            imap.addFlags(emailId, flags, (err) => {
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
      message: `Email marked as ${markAsRead ? 'read' : 'unread'}`,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to mark email:', error);
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
    const { emailAddress, emailPassword, imapServer, imapPort, folder } = req.body;

    const imap = new Imap({
      user: emailAddress,
      password: emailPassword,
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

            imap.addFlags(emailId, ['\\Deleted'], (err) => {
              if (err) {
                reject(err);
                return;
              }

              imap.expunge((err) => {
                if (err) {
                  reject(err);
                  return;
                }

                imap.end();
                resolve(true);
              });
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
      message: 'Email deleted successfully',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to delete email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email',
      error: error.message
    });
  }
});

module.exports = router;
