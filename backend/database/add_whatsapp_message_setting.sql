USE ilena_interior;

INSERT INTO settings (`key`, `value`) VALUES
('whatsapp_message', 'Halo Ilena, mau tanya tanya koleksinya.')
ON DUPLICATE KEY UPDATE `key` = `key`;
