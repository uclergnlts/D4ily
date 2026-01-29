# detailContent Feature Rollout Guide

This guide describes the safe rollout process for the detailContent feature.

## Overview

The detailContent feature adds a new field to articles that provides comprehensive, in-depth content distinct from the summary. This enables:
- Article cards to show concise summaries
- Detail views to show full content
- Better user experience with no duplication

## Rollout Steps

### Step 1: Database Migration (First)

```bash
# Run the migration to add detail_content column to all country tables
npm run db:migrate
```

**What it does:**
- Adds `detail_content` column to tr_articles, de_articles, us_articles, etc.
- Column is nullable for backward compatibility
- Existing articles will have NULL detailContent

**Verification:**
```sql
-- Check column exists
PRAGMA table_info(tr_articles);
-- Should show: detail_content | TEXT | 0 | NULL | 0
```

### Step 2: Backend Deploy

```bash
# Deploy backend with fallback support
npm run build
npm run deploy
```

**Features in this deploy:**
- Feed endpoint excludes detailContent (performance)
- Detail endpoint includes detailContent with fallback to summary
- Backward compatible with existing articles

**Verification:**
```bash
# Test detail endpoint fallback
curl /feed/tr/{article-id}
# Should return detailContent = summary for old articles
```

### Step 3: Scraper Deploy

```bash
# Deploy scraper to generate detailContent for new articles
npm run deploy:scraper
```

**Features:**
- New articles get both summary AND detailContent
- AI similarity guard prevents duplicates
- Quality metrics logging

**Verification:**
```bash
# Check logs for new articles
# Look for: "Article created" with detailContent length > summary length
```

### Step 4: Backfill Existing Articles (Gradual)

#### 4.1 Dry Run First

```bash
# See how many articles would be updated (last 7 days)
npx tsx scripts/backfill-detail-content.ts 7 tr --dry-run
```

**Expected output:**
```
=== Backfill Summary (DRY RUN) ===
Total processed: 150
Total would be updated: 150
Total failed: 0
tr: 150/150 would be updated
```

#### 4.2 Small Batch Test

```bash
# Run for last 7 days only
npx tsx scripts/backfill-detail-content.ts 7 tr
```

**Monitor:**
- OpenAI API costs
- Success rate (should be >90%)
- Any errors in logs

#### 4.3 Expand Gradually

If 7-day test is successful:

```bash
# Expand to 14 days
npx tsx scripts/backfill-detail-content.ts 14 tr

# Then 30 days
npx tsx scripts/backfill-detail-content.ts 30 tr

# Finally all countries
npx tsx scripts/backfill-detail-content.ts 30
```

### Step 5: Monitoring

#### 5.1 Check Null Rate

```bash
# Check what percentage of articles still have null detailContent
npx tsx scripts/monitoring-metrics.ts tr
```

**Target:**
- Null rate < 10% within 1 week
- Null rate < 1% within 1 month

#### 5.2 Check AI Quality

```bash
# Search logs for AI duplicate guard triggers
grep "AI returned similar summary/detailContent" logs/

# Should be < 5% of new articles
```

#### 5.3 Check API Performance

```bash
# Feed endpoint should not include detailContent
curl /feed/tr | jq '.data.articles[0] | has("detailContent")'
# Should return: false
```

## Rollback Plan

If issues occur:

1. **Database:** Column is nullable, old code will work
2. **Backend:** Fallback ensures old articles still work
3. **Scraper:** Can be reverted, articles will have NULL detailContent
4. **Backfill:** Can be stopped anytime, already processed articles keep their content

## Cost Considerations

### OpenAI API Costs

- Each article processed by backfill costs ~$0.001-0.002
- 1000 articles = ~$1-2
- Start with 7 days to estimate costs

### Monitoring Costs

- Metrics script runs on-demand
- No additional infrastructure needed

## Success Criteria

- [ ] Migration applied successfully
- [ ] Backend deploy with no errors
- [ ] New articles have detailContent
- [ ] Backfill completed for last 30 days
- [ ] Null rate < 10%
- [ ] AI duplicate guard rate < 5%
- [ ] No performance degradation
- [ ] Mobile app displays detailContent correctly

## Troubleshooting

### High Null Rate

```bash
# Check if scraper is running
ps aux | grep scraper

# Run backfill
npx tsx scripts/backfill-detail-content.ts 7 tr
```

### AI Duplicate Guard Triggering Too Often

- Check OpenAI prompt in aiService.ts
- May need to adjust temperature or prompt wording

### Performance Issues

- Verify feed endpoint excludes detailContent
- Check DB indexes on publishedAt

## Support

For issues, check:
1. Logs in `/var/log/news-platform/`
2. OpenAI API dashboard for costs
3. Database metrics in Turso/LibSQL dashboard
