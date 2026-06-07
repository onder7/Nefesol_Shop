--
-- PostgreSQL database dump
--

\restrict jYPxj4GG0wbOHbrDe6W5PPKju20YRCfAgnbnWSVU7Ks1EwBif03uj0Z0XpvWC0P

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AddressType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AddressType" AS ENUM (
    'BILLING',
    'SHIPPING'
);


--
-- Name: CancellationReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CancellationReason" AS ENUM (
    'CHANGED_MIND',
    'DELIVERY_TIME_LONG',
    'BETTER_PRICE_FOUND',
    'PRODUCT_INFO_ERROR',
    'OTHER'
);


--
-- Name: CancellationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CancellationStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'REFUNDED'
);


--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DiscountType" AS ENUM (
    'PERCENT',
    'FIXED'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'CUSTOMER',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id text NOT NULL,
    user_id text NOT NULL,
    type public."AddressType" DEFAULT 'SHIPPING'::public."AddressType" NOT NULL,
    title text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text NOT NULL,
    city text NOT NULL,
    district text NOT NULL,
    postal_code text,
    address text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_values (
    id text NOT NULL,
    attribute_id text NOT NULL,
    value text NOT NULL,
    color_hex text,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributes (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    input_type text DEFAULT 'select'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: campaign_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_products (
    id text NOT NULL,
    campaign_id text NOT NULL,
    product_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    discount_text text NOT NULL,
    discount_amount numeric(10,2),
    discount_type text DEFAULT 'percentage'::text,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    show_on_home boolean DEFAULT false NOT NULL,
    color text DEFAULT 'primary'::text NOT NULL,
    display_type text DEFAULT 'sticky'::text NOT NULL,
    cta_text text,
    cta_link text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    image_url text
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id text NOT NULL,
    cart_id text NOT NULL,
    variant_id text NOT NULL,
    quantity integer NOT NULL,
    price_at_add numeric(10,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id text NOT NULL,
    user_id text,
    session_id text,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    parent_id text,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    show_in_menu boolean DEFAULT true NOT NULL
);


--
-- Name: chatbot_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_rules (
    id text NOT NULL,
    title text NOT NULL,
    keywords text[],
    response text NOT NULL,
    quick_replies text[],
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id text NOT NULL,
    user_id text,
    email text NOT NULL,
    name text NOT NULL,
    subject text,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: discount_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_campaigns (
    id text NOT NULL,
    name text NOT NULL,
    discount_text text NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    show_on_home boolean DEFAULT false NOT NULL,
    color text DEFAULT 'primary'::text NOT NULL,
    display_type text DEFAULT 'sticky'::text NOT NULL,
    cta_text text,
    cta_link text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: discount_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_usages (
    id text NOT NULL,
    discount_id text NOT NULL,
    user_id text NOT NULL,
    order_id text NOT NULL,
    used_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discounts (
    id text NOT NULL,
    code text NOT NULL,
    type public."DiscountType" NOT NULL,
    value numeric(10,2) NOT NULL,
    min_order numeric(10,2),
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: order_cancellations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_cancellations (
    id text NOT NULL,
    order_id text NOT NULL,
    status public."CancellationStatus" DEFAULT 'REQUESTED'::public."CancellationStatus" NOT NULL,
    reason public."CancellationReason" NOT NULL,
    description text,
    refund_amount numeric(10,2),
    admin_notes text,
    requested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_at timestamp(3) without time zone,
    refunded_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    coupon_code text,
    coupon_offered boolean DEFAULT false NOT NULL,
    coupon_value numeric(10,2)
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    order_id text NOT NULL,
    variant_id text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL
);


--
-- Name: order_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_logs (
    id text NOT NULL,
    order_id text NOT NULL,
    status public."OrderStatus" NOT NULL,
    note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id text NOT NULL,
    user_id text NOT NULL,
    address_id text NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    shipping_fee numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    order_id text NOT NULL,
    provider text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    transaction_id text,
    payload jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: popup_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.popup_notifications (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    button_text text,
    button_link text,
    is_active boolean DEFAULT false NOT NULL,
    display_freq text DEFAULT 'session'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: product_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_answers (
    id text NOT NULL,
    question_id text NOT NULL,
    user_id text NOT NULL,
    body text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id text NOT NULL,
    product_id text NOT NULL,
    variant_id text,
    url text NOT NULL,
    alt_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL
);


--
-- Name: product_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_questions (
    id text NOT NULL,
    product_id text NOT NULL,
    user_id text,
    guest_name text,
    body text NOT NULL,
    is_answered boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: product_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_tags (
    id text NOT NULL,
    product_id text NOT NULL,
    tag text NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id text NOT NULL,
    product_id text NOT NULL,
    sku text NOT NULL,
    price numeric(10,2) NOT NULL,
    compare_at numeric(10,2),
    stock_qty integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    desi numeric(8,2),
    cost_price_override numeric(10,2),
    markup_percentage_override numeric(5,2)
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    category_id text NOT NULL,
    brand_id text,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    vat_rate integer DEFAULT 20 NOT NULL,
    vat_included boolean DEFAULT true NOT NULL,
    pricing_method text DEFAULT 'fixed'::character varying NOT NULL,
    cost_price numeric(10,2),
    markup_percentage numeric(5,2)
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id text NOT NULL,
    product_id text NOT NULL,
    user_id text NOT NULL,
    rating integer NOT NULL,
    title text,
    body text,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: shippings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shippings (
    id text NOT NULL,
    order_id text NOT NULL,
    carrier text,
    tracking_number text,
    status text DEFAULT 'PREPARING'::text NOT NULL,
    estimated_at timestamp(3) without time zone,
    delivered_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id text NOT NULL,
    user_id text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    avatar_url text,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public."Role" DEFAULT 'CUSTOMER'::public."Role" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: variant_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_attribute_values (
    variant_id text NOT NULL,
    attribute_value_id text NOT NULL
);


--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id text NOT NULL,
    wishlist_id text NOT NULL,
    variant_id text NOT NULL,
    added_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id text NOT NULL,
    user_id text NOT NULL,
    name text DEFAULT 'Favorilerim'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: attribute_values attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_pkey PRIMARY KEY (id);


--
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: campaign_products campaign_products_campaign_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_products
    ADD CONSTRAINT campaign_products_campaign_id_product_id_key UNIQUE (campaign_id, product_id);


--
-- Name: campaign_products campaign_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_products
    ADD CONSTRAINT campaign_products_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chatbot_rules chatbot_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_rules
    ADD CONSTRAINT chatbot_rules_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: discount_campaigns discount_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_campaigns
    ADD CONSTRAINT discount_campaigns_pkey PRIMARY KEY (id);


--
-- Name: discount_usages discount_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_usages
    ADD CONSTRAINT discount_usages_pkey PRIMARY KEY (id);


--
-- Name: discounts discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_cancellations order_cancellations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cancellations
    ADD CONSTRAINT order_cancellations_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_logs order_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_logs
    ADD CONSTRAINT order_status_logs_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: popup_notifications popup_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popup_notifications
    ADD CONSTRAINT popup_notifications_pkey PRIMARY KEY (id);


--
-- Name: product_answers product_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_questions product_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_pkey PRIMARY KEY (id);


--
-- Name: product_tags product_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: shippings shippings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (variant_id, attribute_value_id);


--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: attribute_values_attribute_id_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attribute_values_attribute_id_value_key ON public.attribute_values USING btree (attribute_id, value);


--
-- Name: attributes_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attributes_name_key ON public.attributes USING btree (name);


--
-- Name: attributes_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attributes_slug_key ON public.attributes USING btree (slug);


--
-- Name: brands_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX brands_slug_key ON public.brands USING btree (slug);


--
-- Name: cart_items_cart_id_variant_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_items_cart_id_variant_id_key ON public.cart_items USING btree (cart_id, variant_id);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: discounts_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX discounts_code_key ON public.discounts USING btree (code);


--
-- Name: newsletter_subscribers_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX newsletter_subscribers_email_key ON public.newsletter_subscribers USING btree (email);


--
-- Name: order_cancellations_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX order_cancellations_order_id_key ON public.order_cancellations USING btree (order_id);


--
-- Name: payments_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_order_id_key ON public.payments USING btree (order_id);


--
-- Name: product_tags_product_id_tag_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_tags_product_id_tag_key ON public.product_tags USING btree (product_id, tag);


--
-- Name: product_variants_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);


--
-- Name: products_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);


--
-- Name: reviews_product_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reviews_product_id_user_id_key ON public.reviews USING btree (product_id, user_id);


--
-- Name: shippings_order_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shippings_order_id_key ON public.shippings USING btree (order_id);


--
-- Name: user_profiles_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: wishlist_items_wishlist_id_variant_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wishlist_items_wishlist_id_variant_id_key ON public.wishlist_items USING btree (wishlist_id, variant_id);


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attribute_values attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_values
    ADD CONSTRAINT attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: campaign_products campaign_products_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_products
    ADD CONSTRAINT campaign_products_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: campaign_products campaign_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_products
    ADD CONSTRAINT campaign_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contact_messages contact_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: discount_usages discount_usages_discount_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_usages
    ADD CONSTRAINT discount_usages_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: discount_usages discount_usages_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_usages
    ADD CONSTRAINT discount_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: discount_usages discount_usages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_usages
    ADD CONSTRAINT discount_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_cancellations order_cancellations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_cancellations
    ADD CONSTRAINT order_cancellations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_status_logs order_status_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_logs
    ADD CONSTRAINT order_status_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_answers product_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.product_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_answers product_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_answers
    ADD CONSTRAINT product_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_questions product_questions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_questions product_questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_tags product_tags_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_tags
    ADD CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: shippings shippings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_attribute_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_value_id_fkey FOREIGN KEY (attribute_value_id) REFERENCES public.attribute_values(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wishlist_items wishlist_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: wishlist_items wishlist_items_wishlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES public.wishlists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jYPxj4GG0wbOHbrDe6W5PPKju20YRCfAgnbnWSVU7Ks1EwBif03uj0Z0XpvWC0P

-- Truncate all data
TRUNCATE TABLE user_profiles, addresses, reviews, wishlists, notifications, discount_usages, users, carts, orders, discounts, newsletter_subscribers, product_questions, chatbot_rules, discount_campaigns, popup_notifications, campaigns, product_answers, contact_messages, cart_items, order_items, order_status_logs, payments, shippings, wishlist_items, order_cancellations, products, product_variants, product_images, product_tags, variant_attribute_values, categories, brands, attributes, attribute_values, site_settings, campaign_products CASCADE;
