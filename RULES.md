# RULES.md

> Read this file before every task in this project and follow it exactly.
> If a task conflicts with any rule here, stop and ask before proceeding.

---

## PROJECT

A web app where a group creates an event (a trip, a function), shares an invite link, everyone uploads their photos at full quality, and anyone can filter, select and download photos.

- **Backend:** Django + Django REST Framework + MongoDB (via MongoEngine)
- **Frontend:** React (Vite) + Tailwind CSS
- **Database:** MongoDB in all environments. No PostgreSQL, no SQLite. Use MongoEngine as the ODM.

---

## DESIGN RULES

- It must not look vibe coded or template generated.
- Never use gradients of any kind, and never use purple as a brand color.
- Buttons are rectangular with a border radius of 6px or less. No pill shapes.
- No emoji anywhere in the UI, code comments or copy. Use one consistent SVG icon set (lucide-react).
- No scroll-triggered animation, parallax, or cursor effects. Only short hover and focus transitions under 150ms. Respect prefers-reduced-motion.
- No stock photos and no AI-generated images. Use real screenshots of the finished app or no imagery.
- Pick one real typeface pair and a restrained palette defined as design tokens. Support light and dark mode.

---

## COPY RULES

- No em dashes anywhere. Use commas, colons or full stops.
- No fake reviews, testimonials, customer counters, user numbers or statistics.
- No vague headlines. Every headline and button says exactly what it does, in plain language.
- No lorem ipsum, no placeholder names in shipped code.

---

## ENGINEERING RULES

- Write tests for backend logic. Run all tests and the frontend build before saying a task is done.
- At the end of each task, list the exact commands you ran and their results. Never claim something works unless you ran it.
- Do not add dependencies without telling me why.

---

## LAUNCH RULES

We do not launch until all of the following are true:

- [ ] Custom domain connected with HTTPS.
- [ ] Real favicon set added.
- [ ] Any "made with AI" tag, badge, generator meta tag or framework default branding removed.
- [ ] Privacy Policy page and Terms and Conditions page exist and are linked in the footer.

---

## COLLEGE PROJECT RULES (these override anything more complex)

- This is a college project. The code must be simple enough for a beginner to read and explain.
- Use plain Django and plain React. Use useState, useEffect and React Context only. No Redux, no Celery, no Docker, no microservices, no custom abstractions.
- Keep functions short. Add a short plain English comment above each model, view and component saying what it does and why.
- Prefer fewer files and fewer dependencies. Tell me before adding any new package.
- When a feature has a simple version and a clever version, always build the simple version.
