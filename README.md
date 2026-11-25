# Brilliant Drivers — Static + PHP Clone for Cloudways

A fast, zero-database, zero-WordPress clone of **brilliantdrivers.ca** built for **Cloudways Custom PHP Hosting** (Apache/Nginx + Varnish + PHP 8.x).

## Design System & Extracted Details
- **Fonts**: `Roboto` (weights 300–900) for headings/body and `Roboto Slab` (weights 400–700) for eyebrows, subheadings, and accents—matching the original WordPress/Elementor typography.
- **Colors**:
  - Primary Orange: `#f58814` (`--orange`), Hover: `#d9700a`
  - Price Table Header Gradient: `#ffbb6e` to `#ffa94d` (`--orange-light`)
  - Borders: `#ffc48c` (`--orange-soft`)
  - Ink / Dark Sections: `#111315` (`--ink`), `#15171a` (`--dark`)
  - Popular Ribbon: `#00b51a` (`--green`)
- **Animations**: Subtle `IntersectionObserver` scroll reveals (`[data-reveal]`) with automatic sibling stagger, smooth number counters (`[data-count-to]`), and full `prefers-reduced-motion` support.
- **Hero & Imagery**: Uses the exact hero image (`First-driving-lesson.webp`), logos, and stock photos from the live site.

## Local Build
Requires **Node.js 18+** (zero external npm packages):

```bash
node build.mjs
```

This compiles `src/` into `public_html/` with cache-busted CSS/JS hashes (`?v=<md5>`), `sitemap.xml`, `robots.txt`, `.htaccess`, and `api/submit.php`.

## Deploying to Cloudways (Custom PHP App)
1. **Create Application on Cloudways**:
   - In Cloudways Platform, add a **Custom App (PHP)** on your server (PHP 8.1/8.2/8.3).
   - No MySQL database is needed.
2. **Upload Files**:
   - Connect via SFTP (or Git) and upload the **contents** of `public_html/` into your Cloudways app's `public_html/` directory.
3. **Configure Varnish Exclusion**:
   - In Cloudways **Application Management → Application Settings → Varnish Settings**, add an exclusion rule for URL `/api/submit.php` so form POSTs bypass Varnish cache.
4. **Configure Email Delivery**:
   - Enable the **Elastic Email** add-on (or configure **SMTP** under Server Management → SMTP) so PHP `mail()` in `api/submit.php` reliably delivers registration and contact emails to `info@brilliantdrivers.ca`.
5. **Domain & SSL**:
   - Point `brilliantdrivers.ca` and `www.brilliantdrivers.ca` to your Cloudways server IP, add both under **Domain Management**, and install a free **Let's Encrypt SSL** certificate. `.htaccess` automatically enforces HTTPS and redirects `www` to `brilliantdrivers.ca`.
