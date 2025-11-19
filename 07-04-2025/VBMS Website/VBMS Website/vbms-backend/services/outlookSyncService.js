/**
 * Outlook Email Sync Service
 * Connects to Outlook via IMAP and syncs all emails to VBMS database
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { pgPool } = require('../config/database');

class OutlookSyncService {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.syncInProgress = false;

    // IMAP configuration for GoDaddy Outlook
    this.imapConfig = {
      user: process.env.SMTP_USER, // business@wolfpaqmarketing.com
      password: process.env.SMTP_PASS,
      host: 'imap.secureserver.net', // GoDaddy IMAP server  
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000
    };
  }

  /**
   * Connect to IMAP server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap(this.imapConfig);

        this.imap.once('ready', () => {
          console.log('✅ Connected to Outlook IMAP');
          this.isConnected = true;
          resolve();
        });

        this.imap.once('error', (err) => {
          console.error('❌ IMAP connection error:', err);
          this.isConnected = false;
          reject(err);
        });

        this.imap.once('end', () => {
          console.log('📧 IMAP connection ended');
          this.isConnected = false;
        });

        this.imap.connect();
      } catch (error) {
        console.error('❌ IMAP connect error:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from IMAP server
   */
  disconnect() {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }

  /**
   * Get emails from a specific folder
   */
  async getEmailsFromFolder(folderName, limit = 100) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(folderName, true, (err, box) => {
        if (err) {
          console.error(`❌ Error opening ${folderName}:`, err);
          return reject(err);
        }

        console.log(`📂 Opened ${folderName} - ${box.messages.total} total messages`);

        if (box.messages.total === 0) {
          return resolve([]);
        }

        // Get the most recent emails (limit them)
        const totalMessages = box.messages.total;
        const startSeq = Math.max(1, totalMessages - limit + 1);
        const endSeq = totalMessages;

        const fetch = this.imap.seq.fetch(`${startSeq}:${endSeq}`, {
          bodies: '',
          struct: true
        });

        const emails = [];

        fetch.on('message', (msg, seqno) => {
          let buffer = '';

          msg.on('body', (stream, info) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);

                const emailData = {
                  messageId: parsed.messageId,
                  from: parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown',
                  to: parsed.to?.text || parsed.to?.value?.[0]?.address || 'unknown',
                  subject: parsed.subject || '(No Subject)',
                  date: parsed.date || new Date(),
                  content: {
                    html: parsed.html || '',
                    text: parsed.text || ''
                  },
                  folder: folderName,
                  uid: attrs.uid,
                  flags: attrs.flags,
                  seqno: seqno
                };

                emails.push(emailData);
              } catch (parseError) {
                console.error('❌ Error parsing email:', parseError);
              }
            });
          });
        });

        fetch.once('error', (err) => {
          console.error(`❌ Fetch error in ${folderName}:`, err);
          reject(err);
        });

        fetch.once('end', () => {
          console.log(`✅ Fetched ${emails.length} emails from ${folderName}`);
          resolve(emails);
        });
      });
    });
  }

  /**
   * Convert raw email data to VBMS Email format
   */
  async convertToVBMSFormat(emailData, vbmsUser, category) {
    const isFromUser = emailData.from.includes(vbmsUser.email);
    const isToUser = emailData.to.includes(vbmsUser.email);

    return {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      content: emailData.content,
      status: 'delivered',
      type: 'custom',
      priority: 'normal',

      // Set sender/recipient based on direction
      sender: isFromUser ? {
        userId: vbmsUser.id,
        name: `${vbmsUser.first_name} ${vbmsUser.last_name}`,
        role: vbmsUser.role === 'client' ? 'customer' : vbmsUser.role
      } : {
        name: emailData.from,
        role: 'customer'
      },

      recipient: isToUser ? {
        userId: vbmsUser.id,
        name: `${vbmsUser.first_name} ${vbmsUser.last_name}`,
        role: vbmsUser.role === 'client' ? 'customer' : vbmsUser.role
      } : {
        name: emailData.to,
        role: 'customer'
      },

      category: category,
      flags: {
        isRead: emailData.flags?.includes('\\Seen') || false,
        isStarred: emailData.flags?.includes('\\Flagged') || false,
        isImportant: false,
        hasAttachments: false
      },

      // Store original email metadata
      metadata: {
        outlookSync: true,
        originalMessageId: emailData.messageId,
        outlookUID: emailData.uid,
        outlookFolder: emailData.folder,
        originalDate: emailData.date,
        outlookFlags: emailData.flags
      },

      createdAt: emailData.date,
      updatedAt: new Date()
    };
  }

  /**
   * Check if email already exists in database
   */
  async emailExists(messageId, uid) {
    try {
      const client = await pgPool.connect();
      const result = await client.query(`
        SELECT id FROM emails 
        WHERE metadata->>'originalMessageId' = $1 
        OR metadata->>'outlookUID' = $2
      `, [messageId, uid.toString()]);

      client.release();
      return result.rows.length > 0;
    } catch (error) {
      // If table doesn't exist, assume false but log error
      if (error.code === '42P01') return false;
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  /**
   * Sync all emails for a specific user
   */
  async syncEmailsForUser(userEmail, limit = 100) {
    try {
      console.log(`🔄 Starting email sync for ${userEmail}`);

      if (this.syncInProgress) {
        throw new Error('Sync already in progress');
      }

      this.syncInProgress = true;

      // Find the VBMS user
      const client = await pgPool.connect();
      const userResult = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);
      const vbmsUser = userResult.rows[0];
      client.release();

      if (!vbmsUser) {
        throw new Error(`VBMS user not found: ${userEmail}`);
      }

      // Connect to IMAP
      await this.connect();

      const syncResults = {
        inbox: { fetched: 0, saved: 0, skipped: 0 },
        sent: { fetched: 0, saved: 0, skipped: 0 },
        total: { fetched: 0, saved: 0, skipped: 0 }
      };

      // Sync INBOX
      console.log('📥 Syncing INBOX...');
      try {
        const inboxEmails = await this.getEmailsFromFolder('INBOX', limit);
        syncResults.inbox.fetched = inboxEmails.length;

        for (const emailData of inboxEmails) {
          try {
            // Check if email already exists
            if (await this.emailExists(emailData.messageId, emailData.uid)) {
              syncResults.inbox.skipped++;
              continue;
            }

            // Convert to VBMS format
            const vbmsEmailData = await this.convertToVBMSFormat(emailData, vbmsUser, 'inbox');

            // Save to database
            const saveClient = await pgPool.connect();
            await saveClient.query(`
              INSERT INTO emails (
                user_id, "to", "from", subject, content, status, type, priority, 
                sender, recipient, category, flags, metadata, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
              vbmsUser.id,
              vbmsEmailData.to,
              vbmsEmailData.from,
              vbmsEmailData.subject,
              vbmsEmailData.content,
              vbmsEmailData.status,
              vbmsEmailData.type,
              vbmsEmailData.priority,
              vbmsEmailData.sender,
              vbmsEmailData.recipient,
              vbmsEmailData.category,
              vbmsEmailData.flags,
              vbmsEmailData.metadata,
              vbmsEmailData.createdAt,
              vbmsEmailData.updatedAt
            ]);
            saveClient.release();

            syncResults.inbox.saved++;

          } catch (emailError) {
            console.error('❌ Error processing inbox email:', emailError);
          }
        }
      } catch (inboxError) {
        console.error('❌ Error syncing INBOX:', inboxError);
      }

      // Sync SENT folder
      console.log('📤 Syncing SENT...');
      try {
        const sentEmails = await this.getEmailsFromFolder('Sent', limit);
        syncResults.sent.fetched = sentEmails.length;

        for (const emailData of sentEmails) {
          try {
            // Check if email already exists
            if (await this.emailExists(emailData.messageId, emailData.uid)) {
              syncResults.sent.skipped++;
              continue;
            }

            // Convert to VBMS format
            const vbmsEmailData = await this.convertToVBMSFormat(emailData, vbmsUser, 'sent');

            // Save to database
            const saveClient = await pgPool.connect();
            await saveClient.query(`
              INSERT INTO emails (
                user_id, "to", "from", subject, content, status, type, priority, 
                sender, recipient, category, flags, metadata, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
              vbmsUser.id,
              vbmsEmailData.to,
              vbmsEmailData.from,
              vbmsEmailData.subject,
              vbmsEmailData.content,
              vbmsEmailData.status,
              vbmsEmailData.type,
              vbmsEmailData.priority,
              vbmsEmailData.sender,
              vbmsEmailData.recipient,
              vbmsEmailData.category,
              vbmsEmailData.flags,
              vbmsEmailData.metadata,
              vbmsEmailData.createdAt,
              vbmsEmailData.updatedAt
            ]);
            saveClient.release();

            syncResults.sent.saved++;

          } catch (emailError) {
            console.error('❌ Error processing sent email:', emailError);
          }
        }
      } catch (sentError) {
        console.error('❌ Error syncing SENT folder:', sentError);
      }

      // Calculate totals
      syncResults.total.fetched = syncResults.inbox.fetched + syncResults.sent.fetched;
      syncResults.total.saved = syncResults.inbox.saved + syncResults.sent.saved;
      syncResults.total.skipped = syncResults.inbox.skipped + syncResults.sent.skipped;

      console.log('🎉 Email sync completed!');
      console.log('📊 Sync Results:');
      console.log(`   📥 Inbox: ${syncResults.inbox.saved}/${syncResults.inbox.fetched} saved`);
      console.log(`   📤 Sent: ${syncResults.sent.saved}/${syncResults.sent.fetched} saved`);
      console.log(`   📊 Total: ${syncResults.total.saved}/${syncResults.total.fetched} saved (${syncResults.total.skipped} skipped)`);

      return syncResults;

    } catch (error) {
      console.error('❌ Email sync error:', error);
      throw error;
    } finally {
      this.disconnect();
      this.syncInProgress = false;
    }
  }

  /**
   * Test IMAP connection
   */
  async testConnection() {
    try {
      await this.connect();
      console.log('✅ IMAP connection test successful');
      this.disconnect();
      return true;
    } catch (error) {
      console.error('❌ IMAP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isConnected: this.isConnected,
      syncInProgress: this.syncInProgress
    };
  }
}

module.exports = new OutlookSyncService();