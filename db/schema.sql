-- Full schema. OPTIONAL: the app creates it automatically on an empty database.
CREATE SEQUENCE "public"."vehicle_stock_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);

CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"icon" text,
	"icon_media_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"show_on_home" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"message" text NOT NULL,
	"vehicle_id" integer,
	"transaction_type" text,
	"status" text DEFAULT 'new' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "vehicle_categories" (
	"vehicle_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "vehicle_categories_vehicle_id_category_id_pk" PRIMARY KEY("vehicle_id","category_id")
);

CREATE TABLE "vehicle_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "vehicle_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_number" text NOT NULL,
	"slug" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"trim" text,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"description_ar" text,
	"description_en" text,
	"year" integer NOT NULL,
	"vehicle_type" text DEFAULT 'car' NOT NULL,
	"transaction_type" text NOT NULL,
	"price" numeric(14, 2),
	"rental_period" text,
	"rental_deposit" numeric(14, 2),
	"rental_conditions_ar" text,
	"rental_conditions_en" text,
	"installment_available" boolean DEFAULT false NOT NULL,
	"installment_info_ar" text,
	"installment_info_en" text,
	"mileage" integer,
	"condition" text DEFAULT 'used' NOT NULL,
	"transmission" text,
	"fuel_type" text,
	"engine_capacity" text,
	"body_style" text,
	"exterior_color" text,
	"interior_color" text,
	"location" text,
	"features_ar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"main_image_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"availability" text DEFAULT 'available' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sold_at" timestamp with time zone,
	"recommended_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_stock_number_unique" UNIQUE("stock_number"),
	CONSTRAINT "vehicles_slug_unique" UNIQUE("slug")
);

ALTER TABLE "categories" ADD CONSTRAINT "categories_icon_media_id_media_id_fk" FOREIGN KEY ("icon_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "vehicle_categories" ADD CONSTRAINT "vehicle_categories_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vehicle_categories" ADD CONSTRAINT "vehicle_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "admins_single_primary_idx" ON "admins" USING btree ("is_primary") WHERE is_primary;
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");
CREATE INDEX "inquiries_created_idx" ON "inquiries" USING btree ("created_at");
CREATE INDEX "vehicle_categories_category_idx" ON "vehicle_categories" USING btree ("category_id");
CREATE INDEX "vehicle_images_vehicle_idx" ON "vehicle_images" USING btree ("vehicle_id");
CREATE INDEX "vehicle_models_brand_idx" ON "vehicle_models" USING btree ("brand_id");
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status","availability");
CREATE INDEX "vehicles_tx_idx" ON "vehicles" USING btree ("transaction_type");
CREATE INDEX "vehicles_type_idx" ON "vehicles" USING btree ("vehicle_type");
CREATE INDEX "vehicles_make_idx" ON "vehicles" USING btree ("make");
CREATE INDEX "vehicles_year_idx" ON "vehicles" USING btree ("year");
CREATE INDEX "vehicles_price_idx" ON "vehicles" USING btree ("price");
CREATE INDEX "vehicles_created_idx" ON "vehicles" USING btree ("created_at");
CREATE INDEX "vehicles_pub_created_idx" ON "vehicles" USING btree ("status","created_at");
CREATE INDEX "vehicles_pub_type_created_idx" ON "vehicles" USING btree ("transaction_type","status","created_at");
CREATE INDEX "vehicles_pub_price_idx" ON "vehicles" USING btree ("status","price");
CREATE INDEX "vehicles_pub_year_idx" ON "vehicles" USING btree ("status","year");
CREATE INDEX "vehicles_pub_make_idx" ON "vehicles" USING btree ("status","make");
CREATE INDEX "vehicles_avail_sold_idx" ON "vehicles" USING btree ("availability","sold_at");
CREATE INDEX "vehicles_pub_avail_created_idx" ON "vehicles" USING btree ("status","availability","created_at");
