CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`space_id` integer NOT NULL,
	`email` text NOT NULL,
	`date` text NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`party_size` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "iso_date" CHECK("bookings"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "ends_after_start" CHECK("bookings"."end_min" > "bookings"."start_min"),
	CONSTRAINT "within_a_day" CHECK("bookings"."start_min" >= 0 AND "bookings"."end_min" <= 1440),
	CONSTRAINT "half_hour_slots" CHECK("bookings"."start_min" % 30 = 0 AND "bookings"."end_min" % 30 = 0),
	CONSTRAINT "at_most_two_hours" CHECK("bookings"."end_min" - "bookings"."start_min" <= 120),
	CONSTRAINT "anu_email" CHECK(lower("bookings"."email") LIKE '%@anu.edu.au'),
	CONSTRAINT "party_positive" CHECK("bookings"."party_size" >= 1)
);
--> statement-breakpoint
CREATE INDEX `bookings_space_date` ON `bookings` (`space_id`,`date`);--> statement-breakpoint
CREATE INDEX `bookings_email_date` ON `bookings` (`email`,`date`);--> statement-breakpoint
CREATE TABLE `libraries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opening_hours` (
	`library_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`open_min` integer NOT NULL,
	`close_min` integer NOT NULL,
	PRIMARY KEY(`library_id`, `weekday`),
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weekday_range" CHECK("opening_hours"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "hours_order" CHECK(0 <= "opening_hours"."open_min" AND "opening_hours"."open_min" < "opening_hours"."close_min" AND "opening_hours"."close_min" <= 1440)
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`capacity` integer NOT NULL,
	FOREIGN KEY (`library_id`) REFERENCES `libraries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "capacity_positive" CHECK("spaces"."capacity" > 0)
);
--> statement-breakpoint
CREATE INDEX `spaces_library` ON `spaces` (`library_id`);