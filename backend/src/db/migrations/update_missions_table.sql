-- Update missions table with new constraints and defaults
ALTER TABLE missions
  -- Add new constraints to status
  DROP CONSTRAINT IF EXISTS missions_status_check,
  ADD CONSTRAINT missions_status_check 
    CHECK (status in ('idle', 'taking_off', 'in_progress', 'paused', 'aborted', 'completed', 'failed')),

  -- Add new constraints to phase
  DROP CONSTRAINT IF EXISTS missions_phase_check,
  ADD CONSTRAINT missions_phase_check 
    CHECK (phase in ('takeoff', 'cruise', 'delivery', 'returning', 'landing')),

  -- Set default values for numeric columns
  ALTER COLUMN battery SET DEFAULT 100,
  ALTER COLUMN altitude SET DEFAULT 0,
  ALTER COLUMN eta SET DEFAULT 0,

  -- Add updated_at column if it doesn't exist
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update existing rows to have valid status and phase values
UPDATE missions
SET status = CASE 
    WHEN status NOT IN ('idle', 'taking_off', 'in_progress', 'paused', 'aborted', 'completed', 'failed')
    THEN 'idle'
    ELSE status
  END,
  phase = CASE 
    WHEN phase NOT IN ('takeoff', 'cruise', 'delivery', 'returning', 'landing')
    THEN NULL
    ELSE phase
  END,
  battery = COALESCE(battery, 100),
  altitude = COALESCE(altitude, 0),
  eta = COALESCE(eta, 0),
  updated_at = COALESCE(updated_at, now());

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;

-- Create the trigger
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 