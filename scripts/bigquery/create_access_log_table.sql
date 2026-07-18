-- Optional: create access log table manually (API also auto-creates it).
-- Run in BigQuery with processing location = US

CREATE TABLE IF NOT EXISTS `gen-lang-client-0732074273.qms_dashboard.dashboard_access_log` (
  accessed_at TIMESTAMP NOT NULL,
  email STRING NOT NULL,
  display_name STRING,
  action STRING,
  user_agent STRING,
  page STRING,
  session_id STRING
)
OPTIONS (
  description = "QMS dashboard access log — who opened / signed in"
);

-- View recent access
-- SELECT * FROM `gen-lang-client-0732074273.qms_dashboard.dashboard_access_log`
-- ORDER BY accessed_at DESC
-- LIMIT 100;
