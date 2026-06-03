/*
  Warnings:

  - You are about to drop the column `passwordResetExpires` on the `User` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AuditLog] ADD [tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[CartItem] ADD [tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Category] ADD [tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Coupon] ADD [tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Order] ADD [carrier] NVARCHAR(1000),
[estimatedDelivery] DATETIME2,
[regionId] NVARCHAR(1000),
[shippingCost] FLOAT(53) NOT NULL CONSTRAINT [Order_shippingCost_df] DEFAULT 0.0,
[taxRate] FLOAT(53) NOT NULL CONSTRAINT [Order_taxRate_df] DEFAULT 0.0,
[tenantId] NVARCHAR(1000),
[trackingNumber] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[OrderItem] ADD [warehouseId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Product] ADD [barcode] NVARCHAR(1000),
[deletedAt] DATETIME2,
[inventoryStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Product_inventoryStatus_df] DEFAULT 'IN_STOCK',
[isFeatured] BIT NOT NULL CONSTRAINT [Product_isFeatured_df] DEFAULT 0,
[lowStockThreshold] INT NOT NULL CONSTRAINT [Product_lowStockThreshold_df] DEFAULT 5,
[reservedStock] INT NOT NULL CONSTRAINT [Product_reservedStock_df] DEFAULT 0,
[sku] NVARCHAR(1000),
[stockQuantity] INT NOT NULL CONSTRAINT [Product_stockQuantity_df] DEFAULT 0,
[tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Review] ADD [tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[User] DROP COLUMN [passwordResetExpires];
ALTER TABLE [dbo].[User] ADD [emailVerificationExpiresAt] DATETIME2,
[passwordResetExpiresAt] DATETIME2,
[tenantId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[Vendor] ADD [commissionRate] FLOAT(53) NOT NULL CONSTRAINT [Vendor_commissionRate_df] DEFAULT 15.0,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [Vendor_status_df] DEFAULT 'pending';

-- AlterTable
ALTER TABLE [dbo].[WishlistItem] ADD [tenantId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[VendorProfile] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [supportEmail] NVARCHAR(1000),
    [supportPhone] NVARCHAR(1000),
    [logoUrl] NVARCHAR(1000),
    [bannerUrl] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [city] NVARCHAR(1000),
    [country] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorProfile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VendorProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorProfile_vendorId_key] UNIQUE NONCLUSTERED ([vendorId])
);

-- CreateTable
CREATE TABLE [dbo].[VendorVerification] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [VendorVerification_status_df] DEFAULT 'pending',
    [documentsSubmitted] NVARCHAR(max),
    [rejectionReason] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorVerification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VendorVerification_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorVerification_vendorId_key] UNIQUE NONCLUSTERED ([vendorId])
);

-- CreateTable
CREATE TABLE [dbo].[VendorPayout] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [VendorPayout_currency_df] DEFAULT 'usd',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [VendorPayout_status_df] DEFAULT 'pending',
    [stripePayoutId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorPayout_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VendorPayout_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorPayout_stripePayoutId_key] UNIQUE NONCLUSTERED ([stripePayoutId])
);

-- CreateTable
CREATE TABLE [dbo].[VendorOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [total] FLOAT(53) NOT NULL,
    [commission] FLOAT(53) NOT NULL,
    [payoutAmount] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [VendorOrder_status_df] DEFAULT 'pending',
    [trackingNumber] NVARCHAR(1000),
    [carrier] NVARCHAR(1000),
    [shippedAt] DATETIME2,
    [deliveredAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VendorOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorOrder_orderId_vendorId_key] UNIQUE NONCLUSTERED ([orderId],[vendorId])
);

-- CreateTable
CREATE TABLE [dbo].[VendorOrderItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorOrderId] NVARCHAR(1000) NOT NULL,
    [orderItemId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [price] FLOAT(53) NOT NULL,
    [size] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorOrderItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorOrderItem_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorOrderItem_orderItemId_key] UNIQUE NONCLUSTERED ([orderItemId])
);

-- CreateTable
CREATE TABLE [dbo].[VendorAnalytics] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [salesAmount] FLOAT(53) NOT NULL CONSTRAINT [VendorAnalytics_salesAmount_df] DEFAULT 0.0,
    [ordersCount] INT NOT NULL CONSTRAINT [VendorAnalytics_ordersCount_df] DEFAULT 0,
    [commissionPaid] FLOAT(53) NOT NULL CONSTRAINT [VendorAnalytics_commissionPaid_df] DEFAULT 0.0,
    [netEarnings] FLOAT(53) NOT NULL CONSTRAINT [VendorAnalytics_netEarnings_df] DEFAULT 0.0,
    [pageViews] INT NOT NULL CONSTRAINT [VendorAnalytics_pageViews_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorAnalytics_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VendorAnalytics_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorAnalytics_vendorId_date_key] UNIQUE NONCLUSTERED ([vendorId],[date])
);

-- CreateTable
CREATE TABLE [dbo].[VendorSubscription] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendorId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [tier] NVARCHAR(1000) NOT NULL CONSTRAINT [VendorSubscription_tier_df] DEFAULT 'basic',
    [stripeSubscriptionId] NVARCHAR(1000) NOT NULL,
    [stripePriceId] NVARCHAR(1000) NOT NULL,
    [currentPeriodStart] DATETIME2 NOT NULL,
    [currentPeriodEnd] DATETIME2 NOT NULL,
    [cancelAtPeriodEnd] BIT NOT NULL CONSTRAINT [VendorSubscription_cancelAtPeriodEnd_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VendorSubscription_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [VendorSubscription_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [VendorSubscription_stripeSubscriptionId_key] UNIQUE NONCLUSTERED ([stripeSubscriptionId])
);

-- CreateTable
CREATE TABLE [dbo].[OrderEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OrderEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OrderEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [isRead] BIT NOT NULL CONSTRAINT [Notification_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductAiMetadata] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [styleAesthetic] NVARCHAR(1000),
    [gymStreetwearUsage] NVARCHAR(1000),
    [fitType] NVARCHAR(1000),
    [primaryUseCases] NVARCHAR(1000),
    [outfitCompatibility] NVARCHAR(1000),
    [aiTags] NVARCHAR(1000),
    [sensoryDescription] NVARCHAR(1000),
    [syncedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductAiMetadata_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductAiMetadata_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductAiMetadata_productId_key] UNIQUE NONCLUSTERED ([productId])
);

-- CreateTable
CREATE TABLE [dbo].[OutfitAnalysis] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [imageUrl] NVARCHAR(max) NOT NULL,
    [overallScore] INT NOT NULL,
    [styleCategory] NVARCHAR(1000) NOT NULL,
    [outfitSummary] NVARCHAR(max) NOT NULL,
    [strengths] NVARCHAR(max) NOT NULL,
    [weaknesses] NVARCHAR(max) NOT NULL,
    [detectedColors] NVARCHAR(max) NOT NULL,
    [fitAnalysis] NVARCHAR(max) NOT NULL,
    [confidenceScore] INT NOT NULL,
    [aestheticType] NVARCHAR(1000) NOT NULL,
    [sportwearCompatibility] NVARCHAR(max) NOT NULL,
    [layeringAnalysis] NVARCHAR(max) NOT NULL,
    [recommendedImprovements] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OutfitAnalysis_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [OutfitAnalysis_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OutfitRecommendation] (
    [id] NVARCHAR(1000) NOT NULL,
    [analysisId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [matchScore] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OutfitRecommendation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OutfitRecommendation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SavedOutfit] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [analysisId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SavedOutfit_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SavedOutfit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OutfitChatSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [analysisId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OutfitChatSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [OutfitChatSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OutfitChatMessage] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OutfitChatMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OutfitChatMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserStyleProfile] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [dominantAesthetic] NVARCHAR(1000) NOT NULL,
    [preferredColors] NVARCHAR(1000) NOT NULL,
    [preferredCategories] NVARCHAR(1000) NOT NULL,
    [styleEvolution] NVARCHAR(max) NOT NULL,
    [confidenceScore] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserStyleProfile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserStyleProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserStyleProfile_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[ProductCompatibility] (
    [id] NVARCHAR(1000) NOT NULL,
    [productAId] NVARCHAR(1000) NOT NULL,
    [productBId] NVARCHAR(1000) NOT NULL,
    [compatibilityScore] INT NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductCompatibility_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProductCompatibility_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductCompatibility_productAId_productBId_key] UNIQUE NONCLUSTERED ([productAId],[productBId])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [productId] NVARCHAR(1000) NOT NULL,
    [engineType] NVARCHAR(1000) NOT NULL,
    [eventType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TrendingSnapshot] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [score] FLOAT(53) NOT NULL,
    [snapshotDate] DATETIME2 NOT NULL CONSTRAINT [TrendingSnapshot_snapshotDate_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TrendingSnapshot_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TrendingSnapshot_productId_key] UNIQUE NONCLUSTERED ([productId])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationFeedback] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [feedbackType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationFeedback_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationFeedback_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserStyleDNA] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [dominantAesthetic] NVARCHAR(1000) NOT NULL,
    [preferredColors] NVARCHAR(1000) NOT NULL,
    [preferredCategories] NVARCHAR(1000) NOT NULL,
    [styleEvolution] NVARCHAR(max) NOT NULL,
    [confidenceScore] INT NOT NULL CONSTRAINT [UserStyleDNA_confidenceScore_df] DEFAULT 50,
    [updatedAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserStyleDNA_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserStyleDNA_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserStyleDNA_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[UserPreference] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [locale] NVARCHAR(1000) NOT NULL CONSTRAINT [UserPreference_locale_df] DEFAULT 'en',
    [theme] NVARCHAR(1000) NOT NULL CONSTRAINT [UserPreference_theme_df] DEFAULT 'dark',
    [preferredSizes] NVARCHAR(1000) NOT NULL CONSTRAINT [UserPreference_preferredSizes_df] DEFAULT '',
    [preferredFits] NVARCHAR(1000) NOT NULL CONSTRAINT [UserPreference_preferredFits_df] DEFAULT '',
    [notificationsEnabled] BIT NOT NULL CONSTRAINT [UserPreference_notificationsEnabled_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserPreference_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserPreference_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[UserBehaviorSnapshot] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [recentSearches] NVARCHAR(max) NOT NULL,
    [viewedCategories] NVARCHAR(max) NOT NULL,
    [viewedColors] NVARCHAR(max) NOT NULL,
    [lastActive] DATETIME2 NOT NULL CONSTRAINT [UserBehaviorSnapshot_lastActive_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserBehaviorSnapshot_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserBehaviorSnapshot_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[AiTelemetry] (
    [id] NVARCHAR(1000) NOT NULL,
    [modelName] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [promptTokens] INT NOT NULL,
    [completionTokens] INT NOT NULL,
    [totalTokens] INT NOT NULL,
    [latencySeconds] FLOAT(53) NOT NULL,
    [costUsd] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [errorMessage] NVARCHAR(max),
    [cacheHit] BIT NOT NULL CONSTRAINT [AiTelemetry_cacheHit_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AiTelemetry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AiTelemetry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SearchAnalyticsEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [query] NVARCHAR(500) NOT NULL,
    [userId] NVARCHAR(1000),
    [sessionId] NVARCHAR(1000),
    [resultCount] INT NOT NULL CONSTRAINT [SearchAnalyticsEvent_resultCount_df] DEFAULT 0,
    [topProductId] NVARCHAR(1000),
    [didClick] BIT NOT NULL CONSTRAINT [SearchAnalyticsEvent_didClick_df] DEFAULT 0,
    [didConvert] BIT NOT NULL CONSTRAINT [SearchAnalyticsEvent_didConvert_df] DEFAULT 0,
    [intentJson] NVARCHAR(max),
    [latencyMs] FLOAT(53) NOT NULL CONSTRAINT [SearchAnalyticsEvent_latencyMs_df] DEFAULT 0,
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [SearchAnalyticsEvent_source_df] DEFAULT 'semantic',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SearchAnalyticsEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [SearchAnalyticsEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VisualSearchHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [imageUrl] NVARCHAR(max) NOT NULL,
    [description] NVARCHAR(max),
    [resultCount] INT NOT NULL CONSTRAINT [VisualSearchHistory_resultCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [VisualSearchHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [VisualSearchHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LoyaltyAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [points] INT NOT NULL CONSTRAINT [LoyaltyAccount_points_df] DEFAULT 0,
    [lifetimePoints] INT NOT NULL CONSTRAINT [LoyaltyAccount_lifetimePoints_df] DEFAULT 0,
    [tier] NVARCHAR(1000) NOT NULL CONSTRAINT [LoyaltyAccount_tier_df] DEFAULT 'Bronze',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [LoyaltyAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LoyaltyAccount_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[LoyaltyTransaction] (
    [id] NVARCHAR(1000) NOT NULL,
    [accountId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [points] INT NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [referenceId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyTransaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoyaltyTransaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LoyaltyReward] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [pointsCost] INT NOT NULL,
    [rewardType] NVARCHAR(1000) NOT NULL,
    [rewardValue] FLOAT(53) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [LoyaltyReward_isActive_df] DEFAULT 1,
    [totalStock] INT,
    [usedCount] INT NOT NULL CONSTRAINT [LoyaltyReward_usedCount_df] DEFAULT 0,
    [minTier] NVARCHAR(1000) NOT NULL CONSTRAINT [LoyaltyReward_minTier_df] DEFAULT 'Bronze',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyReward_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LoyaltyReward_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LoyaltyRedemption] (
    [id] NVARCHAR(1000) NOT NULL,
    [accountId] NVARCHAR(1000) NOT NULL,
    [rewardId] NVARCHAR(1000) NOT NULL,
    [couponCode] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [LoyaltyRedemption_status_df] DEFAULT 'active',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyRedemption_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoyaltyRedemption_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReferralCode] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [usesCount] INT NOT NULL CONSTRAINT [ReferralCode_usesCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReferralCode_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [ReferralCode_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ReferralCode_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [ReferralCode_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ReferralEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [referralCodeId] NVARCHAR(1000) NOT NULL,
    [referrerId] NVARCHAR(1000) NOT NULL,
    [referredId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ReferralEvent_status_df] DEFAULT 'registered',
    [rewardedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ReferralEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ReferralEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AbandonedCartJob] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [jobId] NVARCHAR(1000),
    [lastCartUpdate] DATETIME2 NOT NULL,
    [reminderSentAt] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AbandonedCartJob_status_df] DEFAULT 'pending',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AbandonedCartJob_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [AbandonedCartJob_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AbandonedCartJob_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[WishlistAlert] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [alertType] NVARCHAR(1000) NOT NULL,
    [priceThreshold] FLOAT(53),
    [isActive] BIT NOT NULL CONSTRAINT [WishlistAlert_isActive_df] DEFAULT 1,
    [lastTriggeredAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WishlistAlert_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WishlistAlert_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WishlistAlert_userId_productId_alertType_key] UNIQUE NONCLUSTERED ([userId],[productId],[alertType])
);

-- CreateTable
CREATE TABLE [dbo].[UserDeviceToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [deviceType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserDeviceToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserDeviceToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserDeviceToken_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationPreference] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [channel] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [isEnabled] BIT NOT NULL CONSTRAINT [NotificationPreference_isEnabled_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationPreference_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NotificationPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotificationPreference_userId_channel_type_key] UNIQUE NONCLUSTERED ([userId],[channel],[type])
);

-- CreateTable
CREATE TABLE [dbo].[MobileAnalyticsEvent] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [eventType] NVARCHAR(1000) NOT NULL,
    [deviceType] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MobileAnalyticsEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MobileAnalyticsEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SocialCatalogSync] (
    [id] NVARCHAR(1000) NOT NULL,
    [platform] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [itemsSynced] INT NOT NULL,
    [errorMessage] NVARCHAR(1000),
    [syncedAt] DATETIME2 NOT NULL CONSTRAINT [SocialCatalogSync_syncedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SocialCatalogSync_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExchangeRate] (
    [id] NVARCHAR(1000) NOT NULL,
    [sourceCurrency] NVARCHAR(1000) NOT NULL,
    [targetCurrency] NVARCHAR(1000) NOT NULL,
    [rate] FLOAT(53) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExchangeRate_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExchangeRate_sourceCurrency_targetCurrency_key] UNIQUE NONCLUSTERED ([sourceCurrency],[targetCurrency])
);

-- CreateTable
CREATE TABLE [dbo].[Region] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [currencyCode] NVARCHAR(1000) NOT NULL,
    [taxType] NVARCHAR(1000) NOT NULL,
    [taxRate] FLOAT(53) NOT NULL CONSTRAINT [Region_taxRate_df] DEFAULT 0.0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Region_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Region_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Region_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Country] (
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [defaultCurrency] NVARCHAR(1000) NOT NULL,
    [regionId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Country_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Country_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Warehouse] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Warehouse_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Warehouse_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [Warehouse_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Warehouse_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[WarehouseInventory] (
    [id] NVARCHAR(1000) NOT NULL,
    [warehouseId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [WarehouseInventory_quantity_df] DEFAULT 0,
    [reservedQty] INT NOT NULL CONSTRAINT [WarehouseInventory_reservedQty_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WarehouseInventory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WarehouseInventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WarehouseInventory_warehouseId_productId_key] UNIQUE NONCLUSTERED ([warehouseId],[productId])
);

-- CreateTable
CREATE TABLE [dbo].[WarehouseTransfer] (
    [id] NVARCHAR(1000) NOT NULL,
    [fromWarehouseId] NVARCHAR(1000) NOT NULL,
    [toWarehouseId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [WarehouseTransfer_status_df] DEFAULT 'pending',
    [notes] NVARCHAR(1000),
    [sentAt] DATETIME2,
    [receivedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WarehouseTransfer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WarehouseTransfer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RegionProductPrice] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [regionId] NVARCHAR(1000) NOT NULL,
    [price] FLOAT(53) NOT NULL,
    [compareAtPrice] FLOAT(53),
    [currency] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RegionProductPrice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [tenantId] NVARCHAR(1000),
    CONSTRAINT [RegionProductPrice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RegionProductPrice_productId_regionId_key] UNIQUE NONCLUSTERED ([productId],[regionId])
);

-- CreateTable
CREATE TABLE [dbo].[ShippingCarrier] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [ShippingCarrier_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ShippingCarrier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ShippingCarrier_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ShippingCarrier_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ShippingRate] (
    [id] NVARCHAR(1000) NOT NULL,
    [carrierId] NVARCHAR(1000) NOT NULL,
    [regionId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [minDays] INT NOT NULL CONSTRAINT [ShippingRate_minDays_df] DEFAULT 1,
    [maxDays] INT NOT NULL CONSTRAINT [ShippingRate_maxDays_df] DEFAULT 5,
    [baseCost] FLOAT(53) NOT NULL CONSTRAINT [ShippingRate_baseCost_df] DEFAULT 0.0,
    [perKgCost] FLOAT(53) NOT NULL CONSTRAINT [ShippingRate_perKgCost_df] DEFAULT 0.0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ShippingRate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ShippingRate_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaxRule] (
    [id] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000) NOT NULL,
    [stateCode] NVARCHAR(1000),
    [taxType] NVARCHAR(1000) NOT NULL,
    [taxRate] FLOAT(53) NOT NULL,
    [isCompound] BIT NOT NULL CONSTRAINT [TaxRule_isCompound_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaxRule_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TaxRule_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaxRule_countryCode_stateCode_taxType_key] UNIQUE NONCLUSTERED ([countryCode],[stateCode],[taxType])
);

-- CreateTable
CREATE TABLE [dbo].[Tenant] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [subdomain] NVARCHAR(1000) NOT NULL,
    [customDomain] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [Tenant_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Tenant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Tenant_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tenant_subdomain_key] UNIQUE NONCLUSTERED ([subdomain]),
    CONSTRAINT [Tenant_customDomain_key] UNIQUE NONCLUSTERED ([customDomain])
);

-- CreateTable
CREATE TABLE [dbo].[TenantUser] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TenantUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TenantUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TenantUser_tenantId_userId_key] UNIQUE NONCLUSTERED ([tenantId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[TenantSettings] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [storeName] NVARCHAR(1000) NOT NULL,
    [logoUrl] NVARCHAR(1000),
    [primaryColor] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantSettings_primaryColor_df] DEFAULT '#0b0b0b',
    [secondaryColor] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantSettings_secondaryColor_df] DEFAULT '#add500',
    [accentColor] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantSettings_accentColor_df] DEFAULT '#ffffff',
    [themeName] NVARCHAR(1000) NOT NULL CONSTRAINT [TenantSettings_themeName_df] DEFAULT 'dark-luxe',
    [customCss] NVARCHAR(max),
    [cmsJson] NVARCHAR(max),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TenantSettings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TenantSettings_tenantId_key] UNIQUE NONCLUSTERED ([tenantId])
);

-- CreateTable
CREATE TABLE [dbo].[TenantSubscription] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [stripeSubscriptionId] NVARCHAR(1000),
    [stripeCustomerId] NVARCHAR(1000),
    [planCode] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [currentPeriodEnd] DATETIME2,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TenantSubscription_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TenantSubscription_tenantId_key] UNIQUE NONCLUSTERED ([tenantId]),
    CONSTRAINT [TenantSubscription_stripeSubscriptionId_key] UNIQUE NONCLUSTERED ([stripeSubscriptionId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorPayout_vendorId_idx] ON [dbo].[VendorPayout]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorPayout_status_idx] ON [dbo].[VendorPayout]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorOrder_vendorId_idx] ON [dbo].[VendorOrder]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorOrder_status_idx] ON [dbo].[VendorOrder]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorAnalytics_vendorId_idx] ON [dbo].[VendorAnalytics]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VendorSubscription_vendorId_idx] ON [dbo].[VendorSubscription]([vendorId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderEvent_orderId_idx] ON [dbo].[OrderEvent]([orderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_type_idx] ON [dbo].[Notification]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_userId_idx] ON [dbo].[Notification]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutfitAnalysis_tenantId_idx] ON [dbo].[OutfitAnalysis]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutfitChatSession_tenantId_idx] ON [dbo].[OutfitChatSession]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SearchAnalyticsEvent_tenantId_idx] ON [dbo].[SearchAnalyticsEvent]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SearchAnalyticsEvent_query_idx] ON [dbo].[SearchAnalyticsEvent]([query]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SearchAnalyticsEvent_userId_idx] ON [dbo].[SearchAnalyticsEvent]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SearchAnalyticsEvent_createdAt_idx] ON [dbo].[SearchAnalyticsEvent]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SearchAnalyticsEvent_source_idx] ON [dbo].[SearchAnalyticsEvent]([source]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VisualSearchHistory_userId_idx] ON [dbo].[VisualSearchHistory]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [VisualSearchHistory_createdAt_idx] ON [dbo].[VisualSearchHistory]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoyaltyAccount_tenantId_idx] ON [dbo].[LoyaltyAccount]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoyaltyAccount_tier_idx] ON [dbo].[LoyaltyAccount]([tier]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoyaltyTransaction_accountId_idx] ON [dbo].[LoyaltyTransaction]([accountId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoyaltyTransaction_createdAt_idx] ON [dbo].[LoyaltyTransaction]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoyaltyRedemption_accountId_idx] ON [dbo].[LoyaltyRedemption]([accountId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReferralCode_tenantId_idx] ON [dbo].[ReferralCode]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReferralCode_code_idx] ON [dbo].[ReferralCode]([code]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReferralEvent_referrerId_idx] ON [dbo].[ReferralEvent]([referrerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ReferralEvent_referredId_idx] ON [dbo].[ReferralEvent]([referredId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AbandonedCartJob_tenantId_idx] ON [dbo].[AbandonedCartJob]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WishlistAlert_userId_idx] ON [dbo].[WishlistAlert]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WishlistAlert_productId_idx] ON [dbo].[WishlistAlert]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserDeviceToken_userId_idx] ON [dbo].[UserDeviceToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_userId_idx] ON [dbo].[NotificationPreference]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MobileAnalyticsEvent_userId_idx] ON [dbo].[MobileAnalyticsEvent]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MobileAnalyticsEvent_eventType_idx] ON [dbo].[MobileAnalyticsEvent]([eventType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Country_regionId_idx] ON [dbo].[Country]([regionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_tenantId_idx] ON [dbo].[Warehouse]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseInventory_warehouseId_idx] ON [dbo].[WarehouseInventory]([warehouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseInventory_productId_idx] ON [dbo].[WarehouseInventory]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseTransfer_fromWarehouseId_idx] ON [dbo].[WarehouseTransfer]([fromWarehouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseTransfer_toWarehouseId_idx] ON [dbo].[WarehouseTransfer]([toWarehouseId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseTransfer_productId_idx] ON [dbo].[WarehouseTransfer]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RegionProductPrice_tenantId_idx] ON [dbo].[RegionProductPrice]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RegionProductPrice_productId_idx] ON [dbo].[RegionProductPrice]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RegionProductPrice_regionId_idx] ON [dbo].[RegionProductPrice]([regionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ShippingRate_carrierId_idx] ON [dbo].[ShippingRate]([carrierId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ShippingRate_regionId_idx] ON [dbo].[ShippingRate]([regionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TenantUser_tenantId_idx] ON [dbo].[TenantUser]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TenantUser_userId_idx] ON [dbo].[TenantUser]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_tenantId_idx] ON [dbo].[AuditLog]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CartItem_tenantId_idx] ON [dbo].[CartItem]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Category_tenantId_idx] ON [dbo].[Category]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Coupon_tenantId_idx] ON [dbo].[Coupon]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_tenantId_idx] ON [dbo].[Order]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_status_idx] ON [dbo].[Order]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_userId_idx] ON [dbo].[Order]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_tenantId_idx] ON [dbo].[Product]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_categoryId_idx] ON [dbo].[Product]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_inventoryStatus_idx] ON [dbo].[Product]([inventoryStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_sku_idx] ON [dbo].[Product]([sku]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_tenantId_idx] ON [dbo].[Review]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_tenantId_idx] ON [dbo].[User]([tenantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WishlistItem_tenantId_idx] ON [dbo].[WishlistItem]([tenantId]);

-- AddForeignKey
ALTER TABLE [dbo].[VendorProfile] ADD CONSTRAINT [VendorProfile_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorVerification] ADD CONSTRAINT [VendorVerification_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorPayout] ADD CONSTRAINT [VendorPayout_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorOrder] ADD CONSTRAINT [VendorOrder_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorOrder] ADD CONSTRAINT [VendorOrder_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorOrderItem] ADD CONSTRAINT [VendorOrderItem_vendorOrderId_fkey] FOREIGN KEY ([vendorOrderId]) REFERENCES [dbo].[VendorOrder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorAnalytics] ADD CONSTRAINT [VendorAnalytics_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VendorSubscription] ADD CONSTRAINT [VendorSubscription_vendorId_fkey] FOREIGN KEY ([vendorId]) REFERENCES [dbo].[Vendor]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderEvent] ADD CONSTRAINT [OrderEvent_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductAiMetadata] ADD CONSTRAINT [ProductAiMetadata_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitAnalysis] ADD CONSTRAINT [OutfitAnalysis_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitRecommendation] ADD CONSTRAINT [OutfitRecommendation_analysisId_fkey] FOREIGN KEY ([analysisId]) REFERENCES [dbo].[OutfitAnalysis]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitRecommendation] ADD CONSTRAINT [OutfitRecommendation_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SavedOutfit] ADD CONSTRAINT [SavedOutfit_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SavedOutfit] ADD CONSTRAINT [SavedOutfit_analysisId_fkey] FOREIGN KEY ([analysisId]) REFERENCES [dbo].[OutfitAnalysis]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitChatSession] ADD CONSTRAINT [OutfitChatSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitChatSession] ADD CONSTRAINT [OutfitChatSession_analysisId_fkey] FOREIGN KEY ([analysisId]) REFERENCES [dbo].[OutfitAnalysis]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OutfitChatMessage] ADD CONSTRAINT [OutfitChatMessage_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[OutfitChatSession]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserStyleProfile] ADD CONSTRAINT [UserStyleProfile_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductCompatibility] ADD CONSTRAINT [ProductCompatibility_productAId_fkey] FOREIGN KEY ([productAId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductCompatibility] ADD CONSTRAINT [ProductCompatibility_productBId_fkey] FOREIGN KEY ([productBId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationEvent] ADD CONSTRAINT [RecommendationEvent_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationEvent] ADD CONSTRAINT [RecommendationEvent_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TrendingSnapshot] ADD CONSTRAINT [TrendingSnapshot_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationFeedback] ADD CONSTRAINT [RecommendationFeedback_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationFeedback] ADD CONSTRAINT [RecommendationFeedback_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserStyleDNA] ADD CONSTRAINT [UserStyleDNA_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserPreference] ADD CONSTRAINT [UserPreference_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserBehaviorSnapshot] ADD CONSTRAINT [UserBehaviorSnapshot_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoyaltyAccount] ADD CONSTRAINT [LoyaltyAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoyaltyTransaction] ADD CONSTRAINT [LoyaltyTransaction_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[LoyaltyAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoyaltyRedemption] ADD CONSTRAINT [LoyaltyRedemption_accountId_fkey] FOREIGN KEY ([accountId]) REFERENCES [dbo].[LoyaltyAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LoyaltyRedemption] ADD CONSTRAINT [LoyaltyRedemption_rewardId_fkey] FOREIGN KEY ([rewardId]) REFERENCES [dbo].[LoyaltyReward]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReferralCode] ADD CONSTRAINT [ReferralCode_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReferralEvent] ADD CONSTRAINT [ReferralEvent_referralCodeId_fkey] FOREIGN KEY ([referralCodeId]) REFERENCES [dbo].[ReferralCode]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ReferralEvent] ADD CONSTRAINT [ReferralEvent_referrerId_fkey] FOREIGN KEY ([referrerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReferralEvent] ADD CONSTRAINT [ReferralEvent_referredId_fkey] FOREIGN KEY ([referredId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AbandonedCartJob] ADD CONSTRAINT [AbandonedCartJob_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WishlistAlert] ADD CONSTRAINT [WishlistAlert_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserDeviceToken] ADD CONSTRAINT [UserDeviceToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Country] ADD CONSTRAINT [Country_regionId_fkey] FOREIGN KEY ([regionId]) REFERENCES [dbo].[Region]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseInventory] ADD CONSTRAINT [WarehouseInventory_warehouseId_fkey] FOREIGN KEY ([warehouseId]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseInventory] ADD CONSTRAINT [WarehouseInventory_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseTransfer] ADD CONSTRAINT [WarehouseTransfer_fromWarehouseId_fkey] FOREIGN KEY ([fromWarehouseId]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseTransfer] ADD CONSTRAINT [WarehouseTransfer_toWarehouseId_fkey] FOREIGN KEY ([toWarehouseId]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseTransfer] ADD CONSTRAINT [WarehouseTransfer_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RegionProductPrice] ADD CONSTRAINT [RegionProductPrice_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RegionProductPrice] ADD CONSTRAINT [RegionProductPrice_regionId_fkey] FOREIGN KEY ([regionId]) REFERENCES [dbo].[Region]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ShippingRate] ADD CONSTRAINT [ShippingRate_carrierId_fkey] FOREIGN KEY ([carrierId]) REFERENCES [dbo].[ShippingCarrier]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ShippingRate] ADD CONSTRAINT [ShippingRate_regionId_fkey] FOREIGN KEY ([regionId]) REFERENCES [dbo].[Region]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TenantUser] ADD CONSTRAINT [TenantUser_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TenantUser] ADD CONSTRAINT [TenantUser_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TenantSettings] ADD CONSTRAINT [TenantSettings_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TenantSubscription] ADD CONSTRAINT [TenantSubscription_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[Tenant]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
