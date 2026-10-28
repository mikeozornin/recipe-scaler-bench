# PRODUCT.md — Recipe Scaler

Written from the task brief (task-paper-en.md) under the documented autonomy substitution: the no-questions variant of this benchmark task pre-authorizes proceeding without interview.

## What it is

Recipe Scaler — an app for people who cook. It reliably stores your recipes, helps you cook, and works on phone and computer, even offline. Domain: recipe-scaler.ru. Made by Mikhail Ozornin (with Cursor); idea inspired by an app by Roman Shamin.

## The mechanism (one sentence)

Recipes are structured, so everything downstream — scaling for different serving counts, cooking assistance, shopping lists, nutrition — recomputes itself from one source of truth, including rewriting the recipe text when the yield changes.

## Audience and scene

Home cooks who collect recipes from many places (websites, Telegram, cookbooks, handwritten journals) and actually cook from them — hands busy, screen on, ingredients half-chopped. They cook at home, in the evening, often mid-task with a phone propped next to a cutting board. Some cook for two, some for a family of six, some batch-cook — the same recipe needs different yields. They are privacy-aware enough to resent trackers and sign-up walls.

## What it must prove

That a recipe app can be a serious tool — precise scaling, real cooking assistance, honest privacy — without becoming a bloated social network. The first surface (promo) must earn "try it"; the app screens must prove competence: the main desktop screen shows a trustworthy recipe library and a recipe that reads as the control panel for cooking; the mobile recipe screen must be legible mid-cooking, one-handed, flour on fingers.

## Capabilities (from the brief)

- Access from phone and computer; automatic sync, works offline. PWA installable on the home screen. Hotkeys on desktop, standard gestures on phone.
- Recalculate recipes for different serving sizes — the origin of the app. Updates both the ingredient list and the recipe text.
- Cooking assistance: screen wake-lock while cooking, timers, push notifications; timers on computer too.
- Shopping list: add ingredients one by one or the whole recipe at once; check off purchased items, sort, share with the person going to the store.
- Automagical recipe import: from text, one link, many links, almost any text file, photos of cookbook pages, notebooks, handwritten recipe journals.
- AI assistant for recipes: saves a going-wrong dish, explains the recipe, suggests the next step, points out equipment. "A chef always at your fingertips." Connectable via MCP (recipe-scaler.ru/mcp): search recipes, add ones, help cook by chat or voice.
- Discover section: find new recipes, explore authors, save to your collection, build a shortlist.
- Nutrition: Kcal/protein/fat/carbs for the whole dish, per 100 g, or per serving; correctable per ingredient.
- Cookbook: download a public recipe collection as a beautifully formatted PDF with photos, ingredients, instructions.
- Telegram bot: send text or link, saved to your account.
- Chrome extension "Recipe Scaler Importer": one-click import.
- Privacy: no sign-up required, no trackers, no product analytics, no AI training on your recipes, data export and API. recipe-scaler.ru/#/privacy.

## Brand commitments

- Careful, paranoid privacy posture is a stated value, not a footnote.
- English inside mockups (task requirement).
- Voice: confident, warm, concrete; craftsman's pride in reliable machinery; zero hype, zero gamification.

## Design task (this workshop)

Three surfaces in Paper (app.paper.design), one file: promo page 1400px wide (Persuade), desktop main app screen 1400px (Operate), mobile recipe screen 375px (Operate). Tall frames allowed. Pre-generated food photography lives in ./images (10 editorial flat-lay photos on linen/ceramic/cast-iron props).
