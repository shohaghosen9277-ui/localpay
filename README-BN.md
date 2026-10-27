# LocalPay Starter — সেটআপ গাইড

এই প্রজেক্টটি LocalPay-এর প্রাথমিক অ্যাডমিন প্যানেল। এতে ইমেইল/পাসওয়ার্ড লগইন, ডেটাবেসে ম্যানুয়াল পেমেন্ট রেকর্ড, এবং অ্যাডমিনের হাতে যাচাই করার সুবিধা আছে।

**গুরুত্বপূর্ণ:** এটি এখনো কোনো ব্যাংক/bKash/Nagad-এর বাস্তব পেমেন্ট API-তে সংযুক্ত নয়। “যাচাইকৃত” মানে অ্যাডমিন নিজে যাচাই করে স্ট্যাটাস পরিবর্তন করেছেন। শুধু Transaction ID লেখা থাকলেই পেমেন্ট প্রমাণিত হয় না।

## যা লাগবে
- একটি Supabase অ্যাকাউন্ট
- একটি GitHub অ্যাকাউন্ট
- Render অ্যাকাউন্ট (ফ্রি `onrender.com` সাবডোমেইনের জন্য)

## ধাপ ১ — Supabase ডেটাবেস তৈরি
1. https://supabase.com এ লগইন করে নতুন Project তৈরি করুন।
2. Project তৈরি হলে **SQL Editor** খুলুন।
3. এই প্রজেক্টের `schema.sql` ফাইলের সম্পূর্ণ SQL কপি করে SQL Editor-এ পেস্ট করে **Run** চাপুন।
4. Project Settings → API (বা Project Connect/API Keys পেজ) থেকে Project URL, publishable/anon key এবং **service_role/secret key** নিন। Supabase UI-তে নাম কিছুটা আলাদা হতে পারে।

## ধাপ ২ — অ্যাডমিন ইমেইল তৈরি
1. Supabase → Authentication → Users খুলুন।
2. Add user / Create user থেকে আপনার অ্যাডমিন ইমেইল ও শক্তিশালী পাসওয়ার্ড দিয়ে অ্যাকাউন্ট তৈরি করুন।
3. নিচের `ADMIN_EMAIL`-এ যে ইমেইল দেবেন, সেটি ওই অ্যাকাউন্টের ইমেইলের সঙ্গে হুবহু মিলতে হবে।
4. পাবলিক সাইন-আপ দরকার নেই; অচেনা কাউকে অ্যাডমিন অ্যাকাউন্ট দেবেন না।

## ধাপ ৩ — GitHub-এ আপলোড
1. https://github.com এ নতুন repository তৈরি করুন, যেমন `localpay`.
2. ZIP extract করে ভেতরের ফাইলগুলো repository-তে আপলোড করুন। `node_modules` বা `.env` আপলোড করবেন না।
3. `schema.sql`-ও repository-তে রাখুন; এটি Supabase-এ আলাদাভাবে চালাতে হবে।

## ধাপ ৪ — Render-এ ফ্রি সাবডোমেইন
1. https://render.com এ সাইন আপ করুন এবং GitHub কানেক্ট করুন।
2. **New → Web Service** নির্বাচন করে আপনার `localpay` repository-টি connect করুন।
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables-এ এগুলো যোগ করুন:
   - `SUPABASE_URL` = আপনার Supabase Project URL
   - `SUPABASE_ANON_KEY` = আপনার publishable/anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = আপনার secret/service_role key
   - `ADMIN_EMAIL` = আপনার অ্যাডমিন ইমেইল
   - `PORT` = `10000`
6. **Create Web Service** চাপুন। Deploy শেষ হলে Render একটি `https://...onrender.com` URL দেবে। সেটিই আপনার প্রাথমিক সাবডোমেইন।
7. ফ্রি সার্ভিসে কিছু সীমাবদ্ধতা আছে এবং নিষ্ক্রিয় থাকলে জেগে উঠতে সময় লাগতে পারে।

## ধাপ ৫ — লগইন
1. Render URL খুলুন।
2. ধাপ ২-এ তৈরি করা অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।
3. পেমেন্ট রেকর্ড যোগ করুন। লেনদেনের সত্যতা বাইরে থেকে যাচাই করে তারপর **যাচাই** চাপুন।

## নিরাপত্তা — খুব জরুরি
- `SUPABASE_SERVICE_ROLE_KEY` কাউকে দেবেন না, HTML/JavaScript-এ বসাবেন না, GitHub-এ আপলোড করবেন না। এটি কেবল Render Environment Variables-এ থাকবে।
- `.env` ফাইল GitHub-এ আপলোড করবেন না।
- বাস্তব গ্রাহকের টাকা নেওয়ার আগে একজন ডেভেলপার দিয়ে নিরাপত্তা, ব্যাকআপ, লগিং ও পেমেন্ট-প্রোভাইডার যাচাই সম্পূর্ণ করানো উচিত।
- এই starter-এ কোনো public checkout/payment link বা স্বয়ংক্রিয় টাকা গ্রহণের ব্যবস্থা নেই।
- ভবিষ্যতে API যোগ করতে হলে provider-এর অনুমোদিত API, server-side verification/webhook, duplicate transaction protection এবং refund/reconciliation logic যোগ করতে হবে।
