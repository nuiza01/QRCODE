CREATE TYPE "public"."device_type" AS ENUM('mobile', 'tablet', 'desktop', 'bot', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."qr_content_type" AS ENUM('url', 'text', 'wifi', 'vcard', 'email', 'sms', 'tel', 'geo', 'event', 'promptpay');--> statement-breakpoint
CREATE TYPE "public"."qr_mode" AS ENUM('static', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" text NOT NULL,
	"mode" "qr_mode" DEFAULT 'static' NOT NULL,
	"content_type" "qr_content_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"style" jsonb NOT NULL,
	"short_code" text,
	"target_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_target_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"old_url" text,
	"new_url" text NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_daily" (
	"qr_code_id" uuid NOT NULL,
	"day" date NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"device_type" "device_type" DEFAULT 'unknown' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"qr_code_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"country" text,
	"city" text,
	"device_type" "device_type" DEFAULT 'unknown' NOT NULL,
	"os" text,
	"browser" text,
	"referrer" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"provider" text,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_target_history" ADD CONSTRAINT "qr_target_history_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_target_history" ADD CONSTRAINT "qr_target_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_daily" ADD CONSTRAINT "scan_daily_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folders_user_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qr_codes_user_idx" ON "qr_codes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "qr_codes_folder_idx" ON "qr_codes" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_codes_short_code_idx" ON "qr_codes" USING btree ("short_code") WHERE "qr_codes"."short_code" is not null;--> statement-breakpoint
CREATE INDEX "qr_target_history_qr_idx" ON "qr_target_history" USING btree ("qr_code_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_daily_pk" ON "scan_daily" USING btree ("qr_code_id","day","country","device_type");--> statement-breakpoint
CREATE INDEX "scan_daily_qr_day_idx" ON "scan_daily" USING btree ("qr_code_id","day");--> statement-breakpoint
CREATE INDEX "scans_qr_time_idx" ON "scans" USING btree ("qr_code_id","scanned_at");