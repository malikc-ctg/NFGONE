-- Rules to allow INSERT/DELETE on employee_zones view
CREATE OR REPLACE RULE employee_zones_insert AS ON INSERT TO employee_zones
DO INSTEAD
  INSERT INTO contractor_zones (contractor_id, zone_id, created_at)
  VALUES (NEW.employee_id, NEW.zone_id, COALESCE(NEW.created_at, NOW()));

CREATE OR REPLACE RULE employee_zones_delete AS ON DELETE TO employee_zones
DO INSTEAD
  DELETE FROM contractor_zones WHERE contractor_id = OLD.employee_id;
