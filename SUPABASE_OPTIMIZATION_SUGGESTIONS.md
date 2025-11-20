# Supabase Optimization Suggestions

This document outlines potential optimizations and improvements for the Supabase setup in the Formula IHU Hub application.

## 1. Database Performance

### Indexes
- **Add composite indexes** for frequently queried columns:
  ```sql
  -- Example: For bookings queries
  CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
  ON bookings(date, status) 
  WHERE status IN ('pending', 'in_progress');
  
  -- For user_profiles team lookups
  CREATE INDEX IF NOT EXISTS idx_user_profiles_team_role 
  ON user_profiles(team_id, app_role) 
  WHERE team_id IS NOT NULL;
  ```

### Connection Pooling
- **Enable connection pooling** in Supabase dashboard:
  - Go to Settings > Database
  - Enable "Connection Pooling"
  - Use the pooled connection string for server-side operations

### Query Optimization
- **Use `select()` with specific columns** instead of `select('*')`:
  ```typescript
  // Bad
  .select('*')
  
  // Good
  .select('id, name, email, app_role')
  ```

- **Use pagination** for large datasets:
  ```typescript
  .range(0, 49) // First 50 records
  ```

## 2. Real-time Subscriptions

### Optimize Channel Names
- Use specific channel names to reduce overhead:
  ```typescript
  // Instead of generic channels
  supabase.channel('bookings-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `team_id=eq.${teamId}`
    }, handleUpdate)
  ```

### Unsubscribe Properly
- Always clean up subscriptions:
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('...')
    // ... setup
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  ```

## 3. Authentication

### Session Management
- **Implement automatic token refresh** (already done in `client.ts`)
- **Store session in memory** rather than localStorage for better security
- **Use refresh tokens** for long-lived sessions

### Rate Limiting
- Monitor authentication rate limits in Supabase dashboard
- Implement client-side rate limiting for sign-in attempts

## 4. Row Level Security (RLS)

### Policy Performance
- **Use indexes on columns used in RLS policies**:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_user_profiles_team_id 
  ON user_profiles(team_id);
  ```

- **Use SECURITY DEFINER functions** for complex checks (already implemented)

### Policy Optimization
- **Combine multiple policies** where possible to reduce overhead
- **Use `USING` and `WITH CHECK` clauses** efficiently

## 5. Storage

### File Upload Optimization
- **Use resumable uploads** for large files:
  ```typescript
  const { data, error } = await supabase.storage
    .from('bucket')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    })
  ```

- **Implement file size limits** client-side before upload
- **Use CDN** for frequently accessed files

## 6. Caching

### Client-Side Caching
- Implement React Query or SWR for data caching
- Cache user profile and team data
- Use stale-while-revalidate pattern

### Server-Side Caching
- Use Next.js API routes with caching headers
- Implement Redis for session caching (if using custom auth)

## 7. Monitoring

### Enable Supabase Analytics
- Enable query performance monitoring in dashboard
- Set up alerts for slow queries
- Monitor connection pool usage

### Custom Logging
- Use the existing `logger.ts` utility (already implemented)
- Log slow queries and connection issues
- Track authentication failures

## 8. Environment Variables

### Security
- **Never expose service role key** in client-side code
- Use environment variables for all sensitive data
- Rotate API keys regularly

### Configuration
- Use different Supabase projects for dev/staging/prod
- Configure CORS properly in Supabase dashboard

## 9. Error Handling

### Retry Logic
- Implement exponential backoff for failed requests
- Use the `executeSupabaseQuery` helper (already created)
- Handle network errors gracefully

### User Feedback
- Show clear error messages for RLS violations
- Provide actionable feedback for connection issues
- Use toast notifications (already implemented)

## 10. Migration Best Practices

### Migration Strategy
- Test migrations on staging first
- Use transactions for multi-step migrations
- Keep migrations small and focused
- Document all RLS policy changes

### Rollback Plan
- Always have a rollback migration ready
- Test rollback procedures
- Keep database backups

## Implementation Priority

1. **High Priority** (Do Now):
   - Add composite indexes for frequently queried tables
   - Optimize RLS policies with proper indexes
   - Implement proper error handling and retry logic

2. **Medium Priority** (Next Sprint):
   - Set up connection pooling
   - Implement client-side caching
   - Add query performance monitoring

3. **Low Priority** (Future):
   - Set up Redis caching
   - Implement advanced real-time features
   - Add comprehensive analytics

## Debugging Tools

The `SupabaseDebugger` component has been added to help diagnose connection issues:
- Shows connection status
- Displays session information
- Allows manual connection testing
- Provides cookie clearing functionality
- Only visible in development mode

## Next Steps

1. Review and implement high-priority optimizations
2. Monitor Supabase dashboard for performance metrics
3. Set up alerts for connection issues
4. Regularly review and optimize RLS policies
5. Keep Supabase client library updated


