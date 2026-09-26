CREATE TRIGGER bookings_no_overlap
BEFORE INSERT ON bookings
WHEN EXISTS (
	SELECT 1 FROM bookings
	WHERE space_id = NEW.space_id
		AND date = NEW.date
		AND start_min < NEW.end_min
		AND NEW.start_min < end_min
)
BEGIN
	SELECT RAISE(ABORT, 'overlap');
END;
--> statement-breakpoint
CREATE TRIGGER bookings_daily_limit
BEFORE INSERT ON bookings
WHEN NEW.end_min - NEW.start_min <= 120 AND (
	SELECT COALESCE(SUM(end_min - start_min), 0) FROM bookings
	WHERE lower(email) = lower(NEW.email) AND date = NEW.date
) + (NEW.end_min - NEW.start_min) > 120
BEGIN
	SELECT RAISE(ABORT, 'daily_limit');
END;
--> statement-breakpoint
CREATE TRIGGER bookings_capacity
BEFORE INSERT ON bookings
WHEN NEW.party_size > (SELECT capacity FROM spaces WHERE id = NEW.space_id)
BEGIN
	SELECT RAISE(ABORT, 'capacity');
END;
--> statement-breakpoint
CREATE TRIGGER bookings_opening_hours
BEFORE INSERT ON bookings
WHEN NOT EXISTS (
	SELECT 1 FROM opening_hours oh
	JOIN spaces s ON s.library_id = oh.library_id
	WHERE s.id = NEW.space_id
		AND oh.weekday = CAST(strftime('%w', NEW.date) AS INTEGER)
		AND NEW.start_min >= oh.open_min
		AND NEW.end_min <= oh.close_min
)
BEGIN
	SELECT RAISE(ABORT, 'closed');
END;
--> statement-breakpoint
CREATE TRIGGER bookings_immutable
BEFORE UPDATE ON bookings
BEGIN
	SELECT RAISE(ABORT, 'immutable');
END;
--> statement-breakpoint
INSERT INTO libraries (id, name) VALUES
	('chifley', 'Chifley Library'),
	('hancock', 'Hancock Library'),
	('menzies', 'Menzies Library'),
	('law', 'Law Library');
--> statement-breakpoint
INSERT INTO opening_hours (library_id, weekday, open_min, close_min) VALUES
	('chifley', 0, 0, 1440),
	('chifley', 1, 0, 1440),
	('chifley', 2, 0, 1440),
	('chifley', 3, 0, 1440),
	('chifley', 4, 0, 1440),
	('chifley', 5, 0, 1440),
	('chifley', 6, 0, 1440),
	('hancock', 0, 0, 1440),
	('hancock', 1, 0, 1440),
	('hancock', 2, 0, 1440),
	('hancock', 3, 0, 1440),
	('hancock', 4, 0, 1440),
	('hancock', 5, 0, 1440),
	('hancock', 6, 0, 1440),
	('law', 0, 0, 1440),
	('law', 1, 0, 1440),
	('law', 2, 0, 1440),
	('law', 3, 0, 1440),
	('law', 4, 0, 1440),
	('law', 5, 0, 1440),
	('law', 6, 0, 1440),
	('menzies', 1, 600, 960),
	('menzies', 2, 600, 960),
	('menzies', 3, 600, 960),
	('menzies', 4, 600, 960),
	('menzies', 5, 600, 960);
--> statement-breakpoint
INSERT INTO spaces (library_id, name, category, capacity) VALUES
	('chifley', 'Study room 1.01', 'Study Room', 4),
	('chifley', 'Study room 1.02', 'Study Room', 4),
	('chifley', 'Study room 1.03', 'Study Room', 4),
	('chifley', 'Study room 1.04', 'Study Room', 4),
	('chifley', 'Study room 1.05', 'Study Room', 4),
	('chifley', 'Study room 1.06', 'Study Room', 4),
	('chifley', 'Study Room 2.02G', 'Study Room', 4),
	('chifley', 'Study room 3.04', 'Study Room', 4),
	('chifley', 'Study room 3.05', 'Study Room', 4),
	('chifley', 'Study room 3.06', 'Study Room', 4),
	('chifley', 'Study room 3.07', 'Study Room', 4),
	('chifley', 'Study room 4.02', 'Study Room', 2),
	('chifley', 'Study room 4.03', 'Study Room', 2),
	('chifley', 'Study room 4.04', 'Study Room', 2),
	('chifley', 'Study room 4.05', 'Study Room', 2),
	('chifley', 'Study room 4.06', 'Study Room', 2),
	('chifley', 'Study room 4.07', 'Study Room', 2),
	('chifley', 'The Deck', 'The Deck', 8),
	('chifley', 'Accessibility Computer', 'Accessibility Computer', 1),
	('chifley', 'Study Booth 3.10', 'Study Booth', 4),
	('chifley', 'Study Booth 3.11', 'Study Booth', 2),
	('chifley', 'Study Booth 3.12', 'Study Booth', 2),
	('chifley', 'Study Booth 3.13', 'Study Booth', 4),
	('chifley', 'Study Booth 3.14', 'Study Booth', 4),
	('chifley', 'Study Booth 3.15', 'Study Booth', 4),
	('chifley', 'Study Booth 3.16', 'Study Booth', 4),
	('chifley', 'Study Booth 3.17', 'Study Booth', 4),
	('chifley', 'Study Booth 3.18', 'Study Booth', 4),
	('chifley', 'Study Booth 3.19', 'Study Booth', 4),
	('chifley', 'Study Booth 3.20', 'Study Booth', 4),
	('chifley', 'Study Booth 3.21', 'Study Booth', 4),
	('chifley', 'Study Booth 3.22', 'Study Booth', 4),
	('chifley', 'Study Booth 3.23', 'Study Booth', 4),
	('chifley', 'Computer Desk 2.22', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.23', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.24', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.25', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.26', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.27', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.28', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.29', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.30', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.31', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.32', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.33', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.34', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.35', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.36', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.37', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.38', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.39', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.40', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.41', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.42', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.43', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.44', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.45', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.46', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.47', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.48', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.49', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.50', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.51', 'Computer Desk', 1),
	('chifley', 'Computer Desk 2.52', 'Computer Desk', 1),
	('hancock', 'Study room 3.27', 'Study Room', 4),
	('hancock', 'Study room 3.28', 'Study Room', 4),
	('hancock', 'Study room 3.29', 'Study Room', 4),
	('hancock', 'Study room 3.33', 'Study Room', 4),
	('hancock', 'Study room 3.34', 'Study Room', 4),
	('hancock', 'Study room 3.36', 'Study Room', 4),
	('hancock', 'Study room 3.37', 'Study Room', 3),
	('hancock', 'Study room 3.38', 'Study Room', 4),
	('hancock', 'Study room 3.39', 'Study Room', 4),
	('menzies', 'Study room 115A', 'Study Room', 7),
	('menzies', 'Study room 115C', 'Study Room', 3),
	('menzies', 'Study room 115E', 'Study Room', 3),
	('menzies', 'Microfilm Scanner', 'Microform Scanner', 1),
	('law', 'Study room 1', 'Study Room', 4),
	('law', 'Study room 2', 'Study Room', 4),
	('law', 'Study room 3', 'Study Room', 4),
	('law', 'Study room 4', 'Study Room', 4);
