const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class VAPIService {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseURL = 'https://api.vapi.ai';
    this.phoneNumber = process.env.VAPI_PHONE_NUMBER;
    
    if (!this.apiKey) {
      console.warn('⚠️  VAPI API key not configured');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Create a new AI assistant
  async createAssistant(assistantConfig) {
    try {
      const defaultConfig = {
        name: 'VBMS Business Assistant',
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam voice
          stability: 0.5,
          similarityBoost: 0.75
        },
        firstMessage: "Hello! I'm your VBMS business assistant. How can I help you with your business management needs today?",
        systemMessage: `You are a helpful AI assistant for VBMS (Video Business Management System). 
        
        You help business owners with:
        - Business operations and management questions
        - Video surveillance and monitoring advice
        - Task management and productivity tips
        - Customer service best practices
        - Technology integration guidance
        - General business strategy questions
        
        Keep responses helpful, professional, and concise. Focus on practical business advice.
        If asked about technical VBMS features, direct them to their dashboard or support team.`,
        
        functions: [
          {
            name: 'transfer_to_support',
            description: 'Transfer the call to human support when the user needs advanced help',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Reason for transfer'
                }
              },
              required: ['reason']
            }
          },
          {
            name: 'schedule_callback',
            description: 'Schedule a callback for the customer',
            parameters: {
              type: 'object',
              properties: {
                phone: {
                  type: 'string',
                  description: 'Customer phone number'
                },
                preferredTime: {
                  type: 'string',
                  description: 'Preferred callback time'
                },
                topic: {
                  type: 'string',
                  description: 'Topic for the callback'
                }
              },
              required: ['phone', 'preferredTime', 'topic']
            }
          }
        ],
        
        recordingEnabled: true,
        endCallFunctionEnabled: true,
        fillersEnabled: true,
        
        ...assistantConfig
      };

      const response = await this.client.post('/assistant', defaultConfig);
      console.log('✅ VAPI Assistant created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create VAPI assistant:', error.response?.data || error.message);
      throw new Error('Failed to create VAPI assistant');
    }
  }

  // Update an existing assistant
  async updateAssistant(assistantId, updateConfig) {
    try {
      const response = await this.client.patch(`/assistant/${assistantId}`, updateConfig);
      console.log('✅ VAPI Assistant updated:', assistantId);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update VAPI assistant:', error.response?.data || error.message);
      throw new Error('Failed to update VAPI assistant');
    }
  }

  // Get assistant details
  async getAssistant(assistantId) {
    try {
      const response = await this.client.get(`/assistant/${assistantId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get VAPI assistant:', error.response?.data || error.message);
      throw new Error('Failed to get VAPI assistant');
    }
  }

  // List all assistants
  async listAssistants() {
    try {
      const response = await this.client.get('/assistant');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to list VAPI assistants:', error.response?.data || error.message);
      throw new Error('Failed to list VAPI assistants');
    }
  }

  // Make an outbound call
  async makeCall(phoneNumber, assistantId, customOptions = {}) {
    try {
      const callConfig = {
        phoneNumberId: this.phoneNumber,
        assistantId: assistantId,
        customer: {
          number: phoneNumber
        },
        ...customOptions
      };

      const response = await this.client.post('/call', callConfig);
      console.log('✅ VAPI Call initiated:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to make VAPI call:', error.response?.data || error.message);
      throw new Error('Failed to make VAPI call');
    }
  }

  // Get call details
  async getCall(callId) {
    try {
      const response = await this.client.get(`/call/${callId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get VAPI call:', error.response?.data || error.message);
      throw new Error('Failed to get VAPI call');
    }
  }

  // List calls with filters
  async listCalls(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.assistantId) params.append('assistantId', filters.assistantId);
      if (filters.startDate) params.append('createdAtGte', filters.startDate);
      if (filters.endDate) params.append('createdAtLte', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await this.client.get(`/call?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to list VAPI calls:', error.response?.data || error.message);
      throw new Error('Failed to list VAPI calls');
    }
  }

  // Handle function calls from VAPI
  async handleFunctionCall(functionName, parameters, callId) {
    try {
      switch (functionName) {
        case 'transfer_to_support':
          return await this.transferToSupport(parameters, callId);
        
        case 'schedule_callback':
          return await this.scheduleCallback(parameters, callId);
        
        default:
          console.warn(`Unknown function call: ${functionName}`);
          return {
            success: false,
            message: 'Unknown function'
          };
      }
    } catch (error) {
      console.error(`❌ Function call error (${functionName}):`, error.message);
      return {
        success: false,
        message: 'Function execution failed'
      };
    }
  }

  // Transfer to human support
  async transferToSupport(parameters, callId) {
    try {
      // Log the transfer request
      console.log(`📞 Transfer to support requested for call ${callId}:`, parameters);
      
      // Here you would integrate with your support system
      // For now, we'll just log it and return a success message
      
      return {
        success: true,
        message: 'Transferring you to our support team. Please hold.',
        action: 'transfer',
        transferNumber: process.env.SUPPORT_PHONE_NUMBER || '+1-800-SUPPORT'
      };
    } catch (error) {
      console.error('❌ Transfer to support failed:', error.message);
      return {
        success: false,
        message: 'Transfer failed. Please call our support line directly.'
      };
    }
  }

  // Schedule a callback
  async scheduleCallback(parameters, callId) {
    try {
      const { phone, preferredTime, topic } = parameters;
      
      // Save callback request to database
      const CallbackRequest = require('../models/CallbackRequest');
      const callback = new CallbackRequest({
        phone: phone,
        preferredTime: new Date(preferredTime),
        topic: topic,
        callId: callId,
        status: 'pending',
        requestedAt: new Date()
      });
      
      await callback.save();
      
      console.log('📅 Callback scheduled:', callback._id);
      
      return {
        success: true,
        message: `Callback scheduled for ${preferredTime}. We'll call you back regarding ${topic}.`,
        callbackId: callback._id
      };
    } catch (error) {
      console.error('❌ Callback scheduling failed:', error.message);
      return {
        success: false,
        message: 'Failed to schedule callback. Please try again or contact support.'
      };
    }
  }

  // Get call analytics
  async getCallAnalytics(startDate, endDate) {
    try {
      const calls = await this.listCalls({
        startDate: startDate,
        endDate: endDate,
        limit: 1000
      });

      const analytics = {
        totalCalls: calls.length,
        completedCalls: calls.filter(call => call.status === 'ended').length,
        averageDuration: 0,
        totalDuration: 0,
        callsByStatus: {},
        callsByHour: Array(24).fill(0),
        customerSatisfaction: 0
      };

      // Calculate analytics
      let totalDuration = 0;
      let satisfactionSum = 0;
      let satisfactionCount = 0;

      calls.forEach(call => {
        // Count by status
        analytics.callsByStatus[call.status] = (analytics.callsByStatus[call.status] || 0) + 1;
        
        // Duration stats
        if (call.endedAt && call.startedAt) {
          const duration = new Date(call.endedAt) - new Date(call.startedAt);
          totalDuration += duration;
        }
        
        // Calls by hour
        const hour = new Date(call.createdAt).getHours();
        analytics.callsByHour[hour]++;
        
        // Customer satisfaction (if available)
        if (call.analysis?.successEvaluation) {
          satisfactionSum += call.analysis.successEvaluation.score || 0;
          satisfactionCount++;
        }
      });

      analytics.totalDuration = totalDuration;
      analytics.averageDuration = analytics.completedCalls > 0 ? totalDuration / analytics.completedCalls : 0;
      analytics.customerSatisfaction = satisfactionCount > 0 ? satisfactionSum / satisfactionCount : 0;

      return analytics;
    } catch (error) {
      console.error('❌ Failed to get call analytics:', error.message);
      throw new Error('Failed to get call analytics');
    }
  }

  // Test VAPI connection
  async testConnection() {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'VAPI API key not configured'
        };
      }

      // Try to list assistants as a connection test
      await this.client.get('/assistant?limit=1');
      
      return {
        success: true,
        message: 'VAPI connection successful',
        apiKey: this.apiKey ? '✅ Configured' : '❌ Missing',
        phoneNumber: this.phoneNumber || 'Not configured'
      };
    } catch (error) {
      return {
        success: false,
        message: 'VAPI connection failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Webhook event handler
  async handleWebhook(event) {
    try {
      console.log(`📞 VAPI Webhook: ${event.type} for call ${event.call?.id}`);
      
      switch (event.type) {
        case 'call-start':
          await this.handleCallStart(event);
          break;
          
        case 'call-end':
          await this.handleCallEnd(event);
          break;
          
        case 'function-call':
          return await this.handleFunctionCall(
            event.functionCall.name,
            event.functionCall.parameters,
            event.call.id
          );
          
        case 'speech-update':
          await this.handleSpeechUpdate(event);
          break;
          
        default:
          console.log(`Unhandled VAPI webhook event: ${event.type}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ VAPI webhook error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async handleCallStart(event) {
    // Log call start, update database, etc.
    console.log(`📞 Call started: ${event.call.id}`);
  }

  async handleCallEnd(event) {
    // Log call end, save transcript, update analytics, etc.
    console.log(`📞 Call ended: ${event.call.id}, Duration: ${event.call.duration}s`);
  }

  async handleSpeechUpdate(event) {
    // Handle real-time speech updates if needed
    console.log(`🎤 Speech update for call: ${event.call.id}`);
  }

  // Utility methods for testing and general use
  buildAssistantConfig(options = {}) {
    return {
      name: options.name || 'VBMS Business Assistant',
      model: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 500
      },
      voice: options.voice || {
        provider: 'playht',
        voiceId: 'jennifer'
      },
      firstMessage: options.firstMessage || 'Hello! How can I help you with your business today?',
      instructions: options.instructions || 'You are a helpful business assistant for VBMS customers.'
    };
  }

  formatPhoneNumber(phone) {
    // Simple phone number formatting (US format)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  }

  calculateCallCost(durationSeconds) {
    // Simple cost calculation: $0.05 per minute
    const minutes = Math.ceil(durationSeconds / 60);
    return Math.round(minutes * 0.05 * 100) / 100; // Round to 2 decimal places
  }
}

module.exports = new VAPIService();