# Admin Catalog Operations

This runbook covers the complete category, product, banner, and homepage-offer process. Use it when adding a new product range or preparing a campaign.

## 1. Prepare the data

Collect the customer-facing product name, parent category, subcategories, selling unit, INR price, optional MRP and discount, stock quantity, images, description, origin, storage information, nutritional notes, health fact, badges, tags, and variant details.

Use consistent category names and tags. A tag such as `summer` is operationally different from an inconsistent spelling or a tag with trailing whitespace because tags drive dynamic offers.

## 2. Add a category

1. Sign in at `/admin/login` and select **Categories**.
2. Select **Add Category**.
3. Enter the required **Name**.
4. Optionally enter **Icon (emoji)**, **Slug**, **Sort Order**, and **Description**.
5. Upload a **Category Image** or paste a direct image URL.
6. Keep **Active** enabled if customers should see the category.
7. Select **Add Subcategory** for every child grouping needed.
8. For each row, enter the subcategory name and optionally its slug and image.
9. Remove unused blank rows and select **Save Category**.
10. Verify the category’s active state, order, image, and subcategory count in the list.

### Category review

Use Edit to confirm all values were saved. Use deactivate for a temporary hide. Before deleting a category, review its product count and reassign its products; deletion is not a substitute for reclassification.

## 3. Add a product

### 3.1 Open the form

1. Select **Products**.
2. Select **Add Product**.
3. Complete the form before enabling **Published**.

### 3.2 Identity and pricing

| Field | Action |
|---|---|
| Name | Customer-facing product name; required. |
| Slug | Stable URL-friendly value, or leave blank for server handling. |
| Category | Select the verified parent category; required. |
| Unit | Default pack/size, such as `500 g` or `1 L`; required. |
| Price (₹) | Selling price; required and non-negative. |
| Original Price (₹) | Optional MRP/reference price; non-negative when supplied. |
| Discount % | Optional display discount; must be between `0` and `100`. |
| Stock Quantity | Available quantity used for inventory and low-stock monitoring. |
| In Stock | Enable when the product can be ordered. |
| Published | Enable only after the product passes review. |

Prices are INR and tax-inclusive. Checkout recalculates the price from the database, so verify the saved record rather than relying on an old browser tab.

### 3.3 Images

1. Upload the primary image or paste a direct URL.
2. Add additional images when more views are useful.
3. Add a variant image inside the relevant variant row when pack appearance differs.
4. Wait for the preview/upload to finish before saving.

Cloudinary uploads may be stored as structured image objects; direct URLs are also supported. Do not use an inaccessible local file path.

### 3.4 Description and search information

Complete the detail fields as applicable:

- **Description**: product explanation shown on the product page.
- **Origin**: source or region.
- **Storage Info**: storage and handling instructions.
- **Health Fact**: optional educational information.
- **Badges**: comma-separated labels such as `Best Seller, Fresh`.
- **Tags**: comma-separated search/campaign values.
- **Nutritional Info**: one highlight per line.

Do not add a campaign tag unless the product should automatically appear in that tag-based offer.

### 3.5 Variants

Use variants when one product has multiple sizes or pack options, for example `500 ml`, `1 L`, and `2 L`.

1. Select **Add Variant**.
2. Enter the variant **Unit** and **Price**.
3. Add optional original price and discount percentage.
4. Set the variant **In Stock** state.
5. Add an optional variant image.
6. Repeat for each sellable option and remove empty/duplicate rows.

Every variant needs a unit and a valid non-negative price. Variant availability is separate from product-level stock, so review both.

### 3.6 Subcategories

After selecting a category, its subcategories appear in the form. Select every applicable subcategory. A product can belong to more than one. If none appear, edit the category and add subcategories first.

### 3.7 Save and verify

1. Select **Save Product** and resolve any validation message.
2. Find the product in the list.
3. Verify category, unit, price, stock badge, published badge, and image.
4. Open the storefront product page and verify price, variants, and availability.

Saving and publishing are separate: leave Published off when the item is not ready for customers.

## 4. Maintain products

- Edit with the pencil action.
- Use the publish toggle to switch between Published and Draft.
- Use the stock toggle to mark In Stock or Out of Stock without changing quantity.
- Filter by category, stock, published state, price range, search, and sort.
- Export CSV before a bulk change.
- Confirm selected rows before bulk publish/unpublish.
- Check manual offers and order history before deleting.

The Dashboard low-stock panel is a follow-up queue; it does not replenish inventory automatically.

## 5. Create a homepage offer

Offers create homepage product carousels; they do not change product prices.

1. Select **Offers → Add Offer**.
2. Enter **Offer Name**, optional slug, description, and sort order.
3. Choose exactly one selection type:
   - **By Tag**: all published products carrying the entered tag.
   - **By Category**: all published products in the selected category.
   - **Manual**: exact products selected through search/category filters; selected order is retained.
4. Optionally upload or paste a banner image.
5. Set **Start Date** and **End Date** for a scheduled campaign, or leave them empty for no boundary.
6. Keep **Active** enabled when the offer should be eligible to show.
7. Select **Preview**, review the title and products, then select **Save Offer**.
8. Verify the active state and storefront carousel.

An offer appears only when active and inside its schedule. Tag/category offers update as published products change. Manual offers skip products that are missing or unpublished. Use Duplicate for a similar campaign, then change name, selection, dates, and order before activating it.

## 6. Add a banner

1. Select **Banners → Add Banner**.
2. Enter a title.
3. Optionally add subtitle, badge, CTA text, gradient, image, and display order.
4. Preview it, enable **Active**, and save.
5. Confirm the homepage CTA and image on desktop and mobile.

Lower order values display first. Use deactivate for a temporary stop and delete only when the banner should not be retained.

## 7. End-to-end release checklist

- Category is active and correctly ordered.
- Product has the correct category and subcategories.
- Price, original price, discount, unit, and variants are correct.
- Images load correctly.
- Stock quantity and In Stock state are correct.
- Product is Published.
- Tags match any tag-based offer exactly.
- Offer selection contains the intended published products.
- Offer dates and Active state are correct.
- Banner is active and ordered correctly, if used.
- A test storefront visit shows the product and offer.
- Coupons and Delivery Fees are tested separately if the campaign uses them.

## 8. Safeguards and common mistakes

| Mistake | Result | Fix |
|---|---|---|
| Product is saved as a draft | It is intentionally absent from storefront and offer results. | Enable **Published** after review; the form labels this control as customer visibility. |
| Product marked In Stock with zero quantity | The save/toggle request is rejected. | Set a quantity greater than zero, or mark the product Out of Stock. |
| Tag differs from offer tag | Tags are normalized to trimmed lowercase values on save. | Use the same spelling; duplicate labels are removed automatically. |
| Parent category changed after subcategories | The form clears old subcategory selections and the API rejects stale children. | Select the correct category, then reselect its subcategories. |
| Offer dates are wrong or invalid | Invalid dates are rejected; valid times are interpreted in the browser timezone shown in the form. | Check the displayed timezone and edit the datetimes. |
| Manual offer contains unpublished products | An active offer cannot be saved or activated with missing/unpublished products. | Publish the products first or replace them in the selection. |
| Banner order is unexpected | New banners receive the next available order and equal orders have deterministic tie-breaking. | Set the intended order and preview the banner list. |
