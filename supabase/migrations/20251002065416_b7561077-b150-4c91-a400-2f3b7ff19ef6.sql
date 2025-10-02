-- Drop the existing check constraint on method column
ALTER TABLE public.attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_method_check;

-- Add updated check constraint to allow rfid method
ALTER TABLE public.attendance_records
ADD CONSTRAINT attendance_records_method_check 
CHECK (method IN ('barcode', 'qr', 'manual', 'biometric', 'rfid'));