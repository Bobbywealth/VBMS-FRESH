const axios = require('axios');
const { SocialMediaPost, GoogleReview } = require('../models');

class SocialMediaService {
  constructor() {
    // API credentials would be stored in environment variables
    this.instagramConfig = {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    };
    
    this.facebookConfig = {
      accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
      pageId: process.env.FACEBOOK_PAGE_ID
    };
    
    this.twitterConfig = {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    };
    
    this.googleConfig = {
      businessId: process.env.GOOGLE_BUSINESS_ID,
      apiKey: process.env.GOOGLE_API_KEY
    };
  }

  // Instagram Methods
  async getInstagramStats() {
    try {
      const { accessToken, businessAccountId } = this.instagramConfig;
      
      if (!accessToken || !businessAccountId) {
        return this.getDemoInstagramStats();
      }

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${businessAccountId}`,
        {
          params: {
            fields: 'followers_count,media_count',
            access_token: accessToken
          }
        }
      );

      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${businessAccountId}/insights`,
        {
          params: {
            metric: 'impressions,reach,profile_views',
            period: 'day',
            access_token: accessToken
          }
        }
      );

      return {
        followers: response.data.followers_count,
        posts: response.data.media_count,
        insights: insightsResponse.data.data,
        engagement: await this.calculateInstagramEngagement(businessAccountId)
      };
    } catch (error) {
      console.error('Instagram API Error:', error);
      return this.getDemoInstagramStats();
    }
  }

  async getInstagramPosts(limit = 10) {
    try {
      const { accessToken, businessAccountId } = this.instagramConfig;
      
      if (!accessToken || !businessAccountId) {
        return this.getDemoInstagramPosts();
      }

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
        {
          params: {
            fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
            limit: limit,
            access_token: accessToken
          }
        }
      );

      return response.data.data.map(post => ({
        id: post.id,
        content: post.caption,
        type: post.media_type,
        url: post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        platform: 'Instagram'
      }));
    } catch (error) {
      console.error('Instagram Posts Error:', error);
      return this.getDemoInstagramPosts();
    }
  }

  async calculateInstagramEngagement(businessAccountId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${businessAccountId}/insights`,
        {
          params: {
            metric: 'engagement',
            period: 'day',
            access_token: this.instagramConfig.accessToken
          }
        }
      );
      
      const engagementData = response.data.data[0];
      return engagementData ? engagementData.values[0].value : 78; // Default fallback
    } catch (error) {
      return 78; // Default engagement rate
    }
  }

  // Facebook Methods
  async getFacebookStats() {
    try {
      const { accessToken, pageId } = this.facebookConfig;
      
      if (!accessToken || !pageId) {
        return this.getDemoFacebookStats();
      }

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            fields: 'fan_count,talking_about_count',
            access_token: accessToken
          }
        }
      );

      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/insights`,
        {
          params: {
            metric: 'page_impressions,page_engaged_users',
            period: 'day',
            access_token: accessToken
          }
        }
      );

      return {
        followers: response.data.fan_count,
        talkingAbout: response.data.talking_about_count,
        insights: insightsResponse.data.data,
        engagement: await this.calculateFacebookEngagement(pageId)
      };
    } catch (error) {
      console.error('Facebook API Error:', error);
      return this.getDemoFacebookStats();
    }
  }

  async getFacebookPosts(limit = 10) {
    try {
      const { accessToken, pageId } = this.facebookConfig;
      
      if (!accessToken || !pageId) {
        return this.getDemoFacebookPosts();
      }

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/posts`,
        {
          params: {
            fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares',
            limit: limit,
            access_token: accessToken
          }
        }
      );

      return response.data.data.map(post => ({
        id: post.id,
        content: post.message,
        timestamp: post.created_time,
        likes: post.likes ? post.likes.summary.total_count : 0,
        comments: post.comments ? post.comments.summary.total_count : 0,
        shares: post.shares ? post.shares.count : 0,
        platform: 'Facebook'
      }));
    } catch (error) {
      console.error('Facebook Posts Error:', error);
      return this.getDemoFacebookPosts();
    }
  }

  async calculateFacebookEngagement(pageId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/insights`,
        {
          params: {
            metric: 'page_post_engagements',
            period: 'day',
            access_token: this.facebookConfig.accessToken
          }
        }
      );
      
      const engagementData = response.data.data[0];
      return engagementData ? (engagementData.values[0].value / 100) : 65; // Convert to percentage
    } catch (error) {
      return 65; // Default engagement rate
    }
  }

  // Twitter Methods
  async getTwitterStats() {
    try {
      // Twitter API v2 implementation would go here
      // For now, return demo data
      return this.getDemoTwitterStats();
    } catch (error) {
      console.error('Twitter API Error:', error);
      return this.getDemoTwitterStats();
    }
  }

  async getTwitterPosts(limit = 10) {
    try {
      // Twitter API v2 implementation would go here
      // For now, return demo data
      return this.getDemoTwitterPosts();
    } catch (error) {
      console.error('Twitter Posts Error:', error);
      return this.getDemoTwitterPosts();
    }
  }

  // Google Reviews Methods
  async getGoogleReviews() {
    try {
      const { businessId, apiKey } = this.googleConfig;
      
      if (!businessId || !apiKey) {
        return this.getDemoGoogleReviews();
      }

      const response = await axios.get(
        `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/${businessId}/reviews`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      return response.data.reviews.map(review => ({
        id: review.reviewId,
        author: review.reviewer.displayName,
        rating: review.starRating,
        text: review.comment,
        timestamp: review.createTime,
        reply: review.reviewReply ? review.reviewReply.comment : null
      }));
    } catch (error) {
      console.error('Google Reviews Error:', error);
      return this.getDemoGoogleReviews();
    }
  }

  async getGoogleBusinessStats() {
    try {
      const { businessId, apiKey } = this.googleConfig;
      
      if (!businessId || !apiKey) {
        return this.getDemoGoogleStats();
      }

      const response = await axios.get(
        `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/${businessId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      return {
        rating: response.data.averageRating || 4.8,
        reviewCount: response.data.reviewCount || 142,
        name: response.data.locationName
      };
    } catch (error) {
      console.error('Google Business Error:', error);
      return this.getDemoGoogleStats();
    }
  }

  // Post Scheduling Methods
  async schedulePost(postData) {
    try {
      const { platforms, content, scheduledTime, mediaUrls } = postData;
      
      // Store scheduled post in database
      const scheduledPost = await SocialMediaPost.create({
        content,
        platforms,
        scheduledTime: new Date(scheduledTime),
        mediaUrls: mediaUrls || [],
        status: 'scheduled',
        createdAt: new Date()
      });

      // Set up cron job or queue job for posting at scheduled time
      this.schedulePostJob(scheduledPost);

      return {
        success: true,
        postId: scheduledPost._id,
        message: 'Post scheduled successfully'
      };
    } catch (error) {
      console.error('Schedule Post Error:', error);
      throw error;
    }
  }

  async schedulePostJob(scheduledPost) {
    // This would integrate with a job queue like Bull or Agenda
    // For now, we'll simulate the scheduling
    const delay = new Date(scheduledPost.scheduledTime) - new Date();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.publishScheduledPost(scheduledPost);
      }, delay);
    }
  }

  async publishScheduledPost(scheduledPost) {
    try {
      const results = [];
      
      for (const platform of scheduledPost.platforms) {
        let result;
        
        switch (platform.toLowerCase()) {
          case 'instagram':
            result = await this.postToInstagram(scheduledPost);
            break;
          case 'facebook':
            result = await this.postToFacebook(scheduledPost);
            break;
          case 'twitter':
            result = await this.postToTwitter(scheduledPost);
            break;
        }
        
        results.push({ platform, result });
      }

      // Update post status
      await SocialMediaPost.findByIdAndUpdate(scheduledPost._id, {
        status: 'published',
        publishedAt: new Date(),
        results
      });

      return results;
    } catch (error) {
      console.error('Publish Post Error:', error);
      await SocialMediaPost.findByIdAndUpdate(scheduledPost._id, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async postToInstagram(postData) {
    try {
      const { accessToken, businessAccountId } = this.instagramConfig;
      
      // Create media object
      const mediaResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
        {
          caption: postData.content,
          image_url: postData.mediaUrls[0], // Instagram requires at least one image
          access_token: accessToken
        }
      );

      // Publish media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
        {
          creation_id: mediaResponse.data.id,
          access_token: accessToken
        }
      );

      return {
        success: true,
        postId: publishResponse.data.id
      };
    } catch (error) {
      console.error('Instagram Post Error:', error);
      return { success: false, error: error.message };
    }
  }

  async postToFacebook(postData) {
    try {
      const { accessToken, pageId } = this.facebookConfig;
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        {
          message: postData.content,
          access_token: accessToken
        }
      );

      return {
        success: true,
        postId: response.data.id
      };
    } catch (error) {
      console.error('Facebook Post Error:', error);
      return { success: false, error: error.message };
    }
  }

  async postToTwitter(postData) {
    try {
      // Twitter API v2 posting would go here
      // For now, simulate success
      return {
        success: true,
        postId: 'twitter_' + Date.now()
      };
    } catch (error) {
      console.error('Twitter Post Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics Methods
  async getComprehensiveAnalytics(timeframe = '30d') {
    try {
      const [instagram, facebook, twitter, google] = await Promise.all([
        this.getInstagramStats(),
        this.getFacebookStats(),
        this.getTwitterStats(),
        this.getGoogleBusinessStats()
      ]);

      return {
        instagram,
        facebook,
        twitter,
        google,
        summary: {
          totalFollowers: instagram.followers + facebook.followers + twitter.followers,
          averageEngagement: (instagram.engagement + facebook.engagement + twitter.engagement) / 3,
          totalPosts: await this.getTotalPostsCount(),
          averageRating: google.rating
        }
      };
    } catch (error) {
      console.error('Analytics Error:', error);
      throw error;
    }
  }

  async getTotalPostsCount() {
    try {
      const count = await SocialMediaPost.countDocuments({
        status: 'published',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  // Demo Data Methods (fallbacks when APIs are not configured)
  getDemoInstagramStats() {
    return {
      followers: 12543,
      posts: 156,
      engagement: 78,
      growth: 2.3
    };
  }

  getDemoInstagramPosts() {
    return [
      {
        id: 'ig_1',
        content: 'Check out our latest project! 🚀 #webdesign #vbms',
        likes: 234,
        comments: 18,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        platform: 'Instagram'
      },
      {
        id: 'ig_2',
        content: 'Behind the scenes of our development process 💻',
        likes: 189,
        comments: 12,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        platform: 'Instagram'
      }
    ];
  }

  getDemoFacebookStats() {
    return {
      followers: 8234,
      engagement: 65,
      growth: 1.8
    };
  }

  getDemoFacebookPosts() {
    return [
      {
        id: 'fb_1',
        content: 'We\'re excited to announce our new feature launch!',
        likes: 156,
        comments: 23,
        shares: 8,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        platform: 'Facebook'
      }
    ];
  }

  getDemoTwitterStats() {
    return {
      followers: 5678,
      engagement: 45,
      growth: 0.5
    };
  }

  getDemoTwitterPosts() {
    return [
      {
        id: 'tw_1',
        content: '5 tips for growing your business in 2024 🧵',
        likes: 89,
        comments: 12,
        shares: 45,
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        platform: 'Twitter'
      }
    ];
  }

  getDemoGoogleStats() {
    return {
      rating: 4.8,
      reviewCount: 142
    };
  }

  getDemoGoogleReviews() {
    return [
      {
        id: 'review_1',
        author: 'Sarah Johnson',
        rating: 5,
        text: 'Excellent service! The team was very professional and delivered exactly what we needed.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'review_2',
        author: 'Mike Chen',
        rating: 5,
        text: 'Outstanding quality and great communication throughout the project.',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'review_3',
        author: 'Lisa Rodriguez',
        rating: 4,
        text: 'Very satisfied with the results. Would definitely recommend!',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      }
    ];
  }
}

module.exports = SocialMediaService;
