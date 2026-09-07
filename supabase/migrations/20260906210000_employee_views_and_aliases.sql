-- Compatibility views for employee_zones and employee_applications
CREATE OR REPLACE VIEW employee_zones AS
  SELECT contractor_id AS employee_id, zone_id, created_at
  FROM contractor_zones;

CREATE OR REPLACE VIEW employee_applications AS
  SELECT * FROM contractor_applications;
