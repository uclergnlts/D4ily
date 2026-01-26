
const fs = require('fs');
const path = require('path');

const files = [
    'src/components/article/ArticleHeader.tsx',
    'src/components/article/ContentQualityBadges.tsx',
    'src/components/article/EmotionalAnalysisCard.tsx',
    'src/components/article/PerspectivesSection.tsx',
    'src/components/article/PoliticalToneGauge.tsx',
    'src/components/article/SourceInfoBar.tsx',
    'src/components/digest/DigestHeader.tsx',
    'src/components/digest/DigestTopicList.tsx',
    'src/components/feed/BalancedFeedScreen.tsx',
    'src/components/feed/FeaturedCarousel.tsx',
    'src/components/feed/FeedFilterBar.tsx',
    'src/components/interaction/AlignmentVotingWidget.tsx',
    'src/components/interaction/CommentCard.tsx',
    'src/components/interaction/CommentForm.tsx',
    'src/components/interaction/CommentThread.tsx',
    'src/components/profile/ProfileHeader.tsx',
    'src/components/profile/ReputationCard.tsx',
    'src/components/profile/StatsOverview.tsx',
    'src/components/source/ComparisonCard.tsx',
    'src/components/source/SourceAlignmentHistory.tsx',
    'src/components/source/SourceCard.tsx',
    'src/components/ui/NotificationItem.tsx'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const baseName = path.basename(file, '.tsx');

        // Check if displayName is already there
        if (!content.includes(`${baseName}.displayName`)) {
            // Append at the end
            content += `\n${baseName}.displayName = '${baseName}';\n`;
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        } else {
            console.log(`Skipped ${file} (already exists)`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
