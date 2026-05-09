# Real Estate Crawler App - Product & UI Spec

## Overview

Build a web application for real-estate sales users. The system crawls listings from external posting websites, normalizes data, scores opportunities, and helps users track promising properties.

## Primary Users

* Real-estate sales agents
* Property investors
* Internal analysts

## Core Value Proposition

1. Aggregate listings from multiple sources.
2. Surface newly posted properties quickly.
3. Identify undervalued / attractive deals using scoring.
4. Provide workflow tools for follow-up.

---

## Main Navigation (3 Tabs)

### 1. Listings

All crawled properties.

**Purpose**

* Discover new inventory.
* Search by location.
* Apply filters.
* Sort by newest / price / area.

**Recommended UI**

* Ant Design Table on desktop.
* Card list on smaller screens.

**Columns**

* Thumbnail
* Price
* Price per m2
  n- Area
* Address
* Source website
* Posted time
* Actions (View, Add to Watchlist)

**Filters**

* Province / City
* District
* Ward
* Property type
* Price range
* Area range
* Bedrooms (optional)
* Sort: newest, lowest price, highest score

---

### 2. Deals (Good Deals)

AI-scored opportunities.

**Purpose**
Show properties estimated to be below market value or otherwise attractive.

**Card Fields**

* Thumbnail
* Listing price
* Estimated fair price
* Discount vs market (%)
* AI Score (0-100)
* Area + location summary
* Key reasons badges

**Badges Examples**

* Under Market 12%
* Large Frontage
* Corner Lot
* Price Reduced
* Motivated Seller

**Actions**

* View Details
* Add to Watchlist
* Not a Deal
* Hide

**Feedback Modal**
When user clicks Not a Deal:

* Wrong area data
* Bad legal status
* House too old
* Bad shape lot
* Duplicate listing
* Other notes

This feedback should be stored for model improvement.

---

### 3. Watchlist

Properties manually tracked by users.

**Purpose**
Pipeline for active opportunities.

**Statuses**

* New
* Contacted
* Interested Buyer
* Negotiating
* Closed Won
* Lost

**Recommended UI**

* Tabs by status, or Kanban board.

**Card Fields**

* Property summary
* Last contacted date
* Notes
* Next follow-up date
* Assigned user

---

## Global Header

**Components**

* Search bar
* Cascading location filter
* Notifications
* User menu

**Recommended Ant Design Components**

* Layout
* Menu
* Input.Search
* Cascader
* Badge
* Avatar

---

## Property Detail View

Use right-side Drawer or dedicated page.

**Sections**

1. Photo gallery
2. Price summary
3. Raw description from source
4. Parsed attributes
5. AI valuation summary
6. Price history (if available)
7. Map / nearby context
8. Actions

**Actions**

* Add to Watchlist
* Mark as Deal / Not Deal
* Copy link
* Add notes

---

## Data Model (High Level)

### Property

* id
* source
* source_url
* title
* address_raw
* province
* district
* ward
* lat/lng (optional)
* price
* area_m2
* bedrooms
* bathrooms
* frontage_m
* posted_at
* crawled_at
* images[]
* description

### Scoring

* property_id
* ai_score
* estimated_fair_price
* under_market_percent
* reasons[]
* updated_at

### Watchlist

* user_id
* property_id
* status
* notes
* next_followup_at
* created_at

### Feedback

* user_id
* property_id
* type
* comment
* created_at

---

## Scoring Logic (Initial)

Use rule-based engine first, ML later.

Example:

* Price below area median +30
* Good lot shape +10
* Wide road +10
* Old house condition -10
* Bad legal signals -30
* Duplicate stale listing -15

Output score 0-100.

---

## Ant Design Implementation Guide

### Layout

* Layout
* Sider
* Header
* Content

### Listings

* Table
* Form
* Select
* Slider
* Tag
* Pagination

### Deals

* Card
* Badge.Ribbon
* Progress
* Tooltip
* Modal

### Watchlist

* Tabs
* Card
* DatePicker
* Dropdown
* Timeline

### Detail

* Drawer
* Descriptions
* Carousel
* Statistic

---

## Routes

* /app/listings
* /app/deals
* /app/watchlist
* /app/property/:id

---

## UX Priorities

1. Fast page load.
2. Quick filtering.
3. Easy add to Watchlist.
4. Explain why a property is a deal.
5. Allow user correction of AI mistakes.

---

## Future Features

* Lead / customer CRM tab
  n- Daily alerts by district
* Telegram / Zalo notifications
* Duplicate detection across sources
* Price trend charts
* Team assignment / collaboration
* ML-based valuation model

---

## Build Order (MVP)

1. Listings + filters
2. Deals scoring page
3. Watchlist workflow
4. Property detail drawer
5. Feedback loop
6. Notifications
