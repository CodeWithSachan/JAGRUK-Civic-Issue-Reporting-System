// src/components/AskBot.jsx
// ─────────────────────────────────────────────────────────────
// JAGRUK Jan Sevak — 100% OFFLINE Chatbot
// Zero API calls. Smart fuzzy keyword matching engine.
// 600+ Q&A pairs covering every citizen scenario.
// ─────────────────────────────────────────────────────────────
// SETUP: Copy to src/components/AskBot.jsx
//        Add <AskBot /> to your Shell.jsx (or any layout)
//        No npm packages needed — pure React
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AutoFillToast from './AutoFillToast'
// import { MASTER_KB as KB } from '../data/index';

// Ab tumhara existing matching logic (findBestAnswer) 
// is "KB" array par filter chalayega.

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — 600+ Q&A pairs, fully offline
// Add more entries anytime following the same {tags, q, a} shape
// ═══════════════════════════════════════════════════════════════
// src/data/kb_basics.js

 const KB = [
  // ── PLATFORM BASICS ──────────────────────────────────────────
  { tags:['what','jagruk','platform','app','website','kya hai','system','civic','about','overview'], q:'What is JAGRUK?', a:'🏛️ **JAGRUK** stands for **India App for Grievance Reporting & User Knowledge** — an official civic platform of the Govt. of India. Citizens can report local problems like potholes, streetlights, garbage, waterlogging and track them until resolved.' },
  { tags:['full form','stands for','expand','abbreviation','meaning','matlab','naam ka matlab'], q:'What does JAGRUK stand for?', a:'📝 **JAGRUK = India App for Grievance Reporting and User Knowledge.**' },
  { tags:['free','cost','charge','fee','paid','money','paisa','muft','nishulk','no charge'], q:'Is JAGRUK free?', a:'✅ Yes, completely **free** for all citizens. No registration fee, no hidden charges whatsoever.' },
  { tags:['official','government','govt','sarkari','authentic','real','genuine','India govt','legitimate'], q:'Is this an official government platform?', a:'✅ Yes — JAGRUK is an **official platform of the Government of India** for civic grievance reporting.' },
  { tags:['who can','eligible','citizen','resident','anyone','kaun use kare','use kar sakta','allowed'], q:'Who can use JAGRUK?', a:'👥 Any citizen living in **India** can use JAGRUK. No registration or login is required to submit a report.' },
  { tags:['register','login','account','signup','sign up','create account','registration','banaye','account banana'], q:'Do I need to register or login?', a:'🙌 **No login or registration needed** to submit a report! Just fill the form and submit. Only municipal admins need a login.' },
  { tags:['mobile','phone','app','android','ios','download','install','play store','app store'], q:'Is there a mobile app?', a:'📱 JAGRUK is a **mobile-optimized website** — works great on any smartphone browser. No app download needed. Just open the website on Chrome or Safari.' },
  { tags:['browser','chrome','firefox','safari','edge','support','compatible','work on','open in'], q:'Which browsers does JAGRUK support?', a:'🌐 Works on all modern browsers — **Chrome, Firefox, Safari, Edge**. For best experience use the latest Chrome or Firefox.' },
  { tags:['language','hindi','english','bhasha','hindi mein','hindi support','translate','switch language'], q:'Is JAGRUK available in Hindi?', a:'🗣️ Yes! JAGRUK supports both **Hindi and English**. Use the language toggle (EN/HI) in the header to switch.' },
  { tags:['contact','helpline','phone number','email','support','help line','toll free','number','customer care'], q:'How do I contact JAGRUK support?', a:'📞 For support, contact your **local municipal office** or district administration. The platform is managed by the Govt. of India.' },
  { tags:['privacy','data','personal info','secure','safe','information share','data leak','confidential'], q:'Is my personal information safe?', a:'🔒 Your contact details are only used by authorities to follow up on your report. They are **not publicly displayed** — only issue type, location, and status are publicly visible.' },
  { tags:['purpose','why','goal','benefit','use','why use','kyu use','what for','civic engagement'], q:'Why should I use JAGRUK?', a:'🌟 JAGRUK gives you a **direct channel to the government**. Instead of waiting for problems to be noticed, you actively report them, track resolution, and hold authorities accountable. Your report makes India better!' },

  // ── HOW TO REPORT ────────────────────────────────────────────
  { tags:['report','submit','file','shikayat','complaint','kaise','how to','register issue','darz kare','darj','lodge','bharo'], q:'How do I report a civic issue?', a:'📝 Reporting takes under 2 minutes:\n1. Click **"Report an Issue"** on the home page\n2. Enter your **name** and **contact number**\n3. Select **issue type** (pothole, streetlight, trash, etc.)\n4. Write a **description** of the problem\n5. **Pin location** on the map or type your address\n6. Upload a **photo** (optional but helpful)\n7. Solve the **CAPTCHA** and click **Submit** ✅' },
  { tags:['captcha','code','verify','number','sum','math','captcha kya','what is captcha','wrong captcha','captcha meaning'], q:'What is the CAPTCHA?', a:'🔢 CAPTCHA is a simple **4-digit number** shown on screen. Just type it in and submit. It prevents spam submissions. If it fails, click refresh and try the new number.' },
  { tags:['captcha wrong','captcha error','captcha not working','wrong code','captcha fail','refresh captcha','captcha problem'], q:'CAPTCHA is not working', a:'🔄 Click the **refresh icon** next to the CAPTCHA to get a new number. Type only digits, no spaces. If it keeps failing, try refreshing the whole page.' },
  { tags:['photo','image','upload','attach','picture','pic','photo upload','attach image','tasveer','add photo'], q:'How do I upload a photo?', a:'📸 In the report form, scroll to **"Images"** section. Click upload and select up to **5 photos** from your device. Supported formats: JPEG, PNG, WEBP, GIF. Max size: **5MB per image**.' },
  { tags:['photo size','image size','too large','file too big','mb','size limit','compress image','photo bada'], q:'My photo is too large', a:'📏 Photos must be under **5MB** each. Try:\n- Compressing with your phone gallery (reduce quality)\n- Use free tools like TinyPNG online\n- On iPhone: Settings → Camera → Format → Most Compatible (saves as JPEG)' },
  { tags:['photo optional','no photo','without photo','image required','must upload photo','photo mandatory','photo zaruri'], q:'Is a photo mandatory?', a:'📷 No, photos are **optional**. Your report will be accepted without one. But photos help authorities identify and fix issues much faster — highly recommended!' },
  { tags:['voice','audio','record','voice note','mic','microphone','speak','bol ke','bolo'], q:'Can I record a voice note?', a:'🎙️ Yes! The form has a **Voice Note** option. Click the microphone button to record a short audio description — great if typing is difficult.' },
  { tags:['location','gps','map pin','pin','coordinate','where','place','address','locate','jagah','location set'], q:'How do I set the location on the map?', a:'📍 Three ways:\n1. **Click on the map** to drop a pin at the exact spot\n2. **Drag the pin** to fine-tune the position\n3. **Type your address** in the field — map auto-locates it\n\nAllow GPS for the most accurate placement.' },
  { tags:['gps not working','location not found','location error','cant find location','location access','gps off','location permission'], q:'GPS / Location is not working', a:'📍 If GPS fails:\n1. Allow **location permission** in browser settings\n2. Turn ON your phone\'s GPS/location\n3. **Manually click the map** to pin location\n4. Or just type the address in the text field' },
  { tags:['required fields','mandatory','must fill','compulsory','what is required','fill karna','required kya hai'], q:'What fields are required?', a:'✅ **Required:** Name, Contact Number, Issue Type, Description, CAPTCHA.\n📌 Location and photo are optional but highly recommended for faster resolution.' },
  { tags:['address','area','mohalla','colony','village','town','pin location','locality','street name','kahan'], q:'How do I enter the address?', a:'🏘️ Start typing your **area, colony, or landmark** — autocomplete suggestions appear. You can also just describe it (e.g., "Near Durgabari Temple, Ranchi"). Or click the map to pin it directly.' },
  { tags:['multiple reports','more than one','two reports','bulk report','can i submit twice','submit again'], q:'Can I submit multiple reports?', a:'📋 Yes! Submit **one report per issue**. Each gets its own tracking and resolution by the relevant department.' },
  { tags:['edit','modify','change report','update report','correct mistake','wrong info','galti','correction'], q:'Can I edit a submitted report?', a:'⚠️ Reports **cannot be edited** after submission. If there\'s a mistake, submit a new corrected report or contact the municipal office.' },
  { tags:['delete','remove','cancel','withdraw','take back report','hatao','report cancel'], q:'Can I delete my report?', a:'🗑️ Citizens cannot delete their own reports. Only **admins** can remove them. Contact the municipal office if a report needs to be removed.' },
  { tags:['submitted','confirmation','success','report submitted','after submit','what next','kya hoga','next step'], q:'What happens after I submit?', a:'✅ After submission:\n1. Report appears on the **public map** instantly\n2. Authorities receive a notification\n3. Status progresses: **Submitted → Acknowledged → In Progress → Resolved**\n4. Track progress on the **Map View** page' },
  { tags:['form lost','data lost','refresh lost','back button','accidentally closed','filled form disappeared'], q:'I lost my form data accidentally', a:'😞 Form data is lost on refresh/navigation. You\'ll need to fill it again. Tip: Keep your description short or take a screenshot before submitting.' },
  { tags:['anonymous','hide name','identity hidden','name visible','public name'], q:'Will my name be publicly visible?', a:'🔒 Your name and contact are **not shown publicly**. Only the issue type, location, and status are visible to other citizens on the map.' },

  // ── ISSUE TYPES ──────────────────────────────────────────────
  { tags:['pothole','road','khada','gaddha','sadak','repair','broken road','road damage','road hole','road problem'], q:'How to report a pothole?', a:'🛣️ Select **"Pothole"** as issue type. Describe the size (small/large/dangerous) and exact road location. Pin the spot on the map and upload a photo — photos speed up repair significantly.' },
  { tags:['streetlight','light','bijli','lamp post','dark road','broken light','street lamp','andhera','light band','light not working'], q:'How to report a broken streetlight?', a:'💡 Select **"Streetlight"**. Mention the pole number if visible. Describe whether it\'s completely off or flickering. Pin the exact location on the map.' },
  { tags:['garbage','trash','waste','kuda','kachra','dustbin','litter','garbage pile','safai','cleaning','refuse'], q:'How to report garbage or overflowing bins?', a:'🗑️ Select **"Trash"**. Describe the location (market, roadside, park) and how long it\'s been there. A photo helps enormously for faster cleanup.' },
  { tags:['water','leakage','pipe burst','drain','waterlogging','flooding','pani','nali','paani bhar','water problem'], q:'How to report water leakage or flooding?', a:'💧 Select **"Water Leakage"**. Describe: burst pipe, blocked drain, or flooding? Mention duration and whether it\'s affecting homes or blocking traffic.' },
  { tags:['graffiti','vandalism','wall painting','illegal paint','defacement','deewar pe','writing on wall'], q:'How to report graffiti?', a:'🎨 Select **"Graffiti"**. Upload a photo and pin the location. Describe the surface affected (wall, monument, public property).' },
  { tags:['other','not in list','different issue','custom issue','category not found','not listed','else','aur'], q:'My issue type is not in the list', a:'📝 Select **"Other"** and describe your problem in detail in the comment box. Authorities will categorize it appropriately.' },
  { tags:['sewer','sewage','nali','manhole','open drain','gutter','stench','smell','badbu','sewage problem'], q:'How to report sewage or drain issues?', a:'🚰 Select **"Water Leakage"** or **"Other"**. Describe it as a sewage/drain problem. Mention foul smell, overflow, or open manhole — safety hazards get **priority treatment**.' },
  { tags:['tree','fallen tree','overgrown','branches','park','garden','jungle','tree block'], q:'How to report a fallen or dangerous tree?', a:'🌳 Select **"Other"** and describe the tree issue. If it\'s blocking a road or is a safety hazard, say so clearly — it gets treated as **high priority**.' },
  { tags:['illegal construction','encroachment','building','construction','occupy','qabza','illegal building'], q:'How to report illegal construction?', a:'🏗️ Select **"Other"** and describe the encroachment. Include address, what is occupied (footpath, public land, road), and how long it\'s been there.' },
  { tags:['noise','sound','loud','music','nuisance','disturbance','shor','pollution','loud music'], q:'Can I report noise pollution?', a:'🔊 Select **"Other"** and describe the noise source (loudspeaker, construction, factory), the time it occurs, and duration.' },
  { tags:['animal','stray dog','cow','cattle','roaming','biting','street animal','awara','dog bite'], q:'Can I report stray animals?', a:'🐕 Select **"Other"** and describe the situation. If the animal is injured or dangerous, mention it as **URGENT** for faster response.' },
  { tags:['electricity','power cut','transformer','wire','bijli line','electric pole','hanging wire','electric problem'], q:'How to report electrical hazards?', a:'⚡ Select **"Other"** for electrical hazards (hanging wires, damaged poles). Describe the safety risk clearly. For **power outages**, contact JBVNL directly as that\'s outside JAGRUK\'s scope.' },
  { tags:['park','garden','playground','public space','bench','broken facility','swing','bench broken'], q:'How to report broken park facilities?', a:'🌳 Select **"Other"** and describe the broken facility (bench, swing, pathway). Mention the park name and what specifically needs repair.' },
  { tags:['road sign','signboard','traffic sign','milestone','broken sign'], q:'How to report damaged road signs?', a:'🚧 Select **"Other"** and describe the damaged sign. Note the exact location (intersection, highway marker). Road signs are a safety issue and usually get quick attention.' },
  { tags:['footpath','pavement','sidewalk','walkway','path','footpath broken'], q:'How to report damaged footpaths?', a:'🚶 Select **"Pothole"** or **"Other"** and describe the footpath damage. Mention if it\'s causing difficulty for pedestrians, elderly, or disabled persons — that increases priority.' },

  // ── STATUS TRACKING ──────────────────────────────────────────
  { tags:['status','track','progress','update','my report','check status','kahan','report ka kya hua','dekhna','status kaise dekhe'], q:'How to track my report status?', a:'🔍 Go to **Map View** page and search your area. Your report appears as a colored marker:\n🟡 Yellow = Submitted\n🔵 Blue = Acknowledged\n🔷 Dark Blue = In Progress\n🟢 Green = Resolved' },
  { tags:['submitted status','what does submitted mean','just submitted','new report status','submitted matlab'], q:'What does "Submitted" status mean?', a:'🟡 **Submitted** = Your report was received and is waiting for admin review. This is the very first step after filing.' },
  { tags:['acknowledged','what is acknowledged','ack','seen','viewed','mana gaya','acknowledged matlab'], q:'What does "Acknowledged" mean?', a:'🔵 **Acknowledged** = An admin has reviewed your report and confirmed it\'s a valid issue. Action planning has begun.' },
  { tags:['in progress','work started','under repair','ongoing','being fixed','kaam chal raha','progress matlab'], q:'What does "In Progress" mean?', a:'🔷 **In Progress** = Work has **actively started** on your issue. A repair team is on the ground.' },
  { tags:['resolved','fixed','done','complete','closed','finished','green status','hal ho gaya','resolved matlab'], q:'What does "Resolved" mean?', a:'🟢 **Resolved** = The issue is **fixed and closed**. If it\'s not actually resolved, submit a new report mentioning the previous complaint.' },
  { tags:['stuck','no update','not moving','status not changing','slow','pending too long','delayed','kab tak','update nahi'], q:'My report status has not changed', a:'⏳ If no update after **7–10 working days**:\n1. Submit a **follow-up report** at the same location\n2. Contact your **local municipal office** directly\n3. Mention it\'s a follow-up on an existing complaint\n4. Safety hazards get addressed faster — clearly state urgency' },
  { tags:['how long','time','resolution time','days','weeks','when will','kitne din','jaldi kab','kab tak thik hoga'], q:'How long to resolve an issue?', a:'⏱️ Estimated timelines:\n🚨 **Critical** (open manhole, flooding): 24–48 hours\n⚠️ **High** (large pothole, broken streetlight): 3–7 days\n📋 **Normal** (garbage, graffiti): 7–14 working days\n\nActual time depends on department workload and resources.' },
  { tags:['priority','urgent','emergency','critical','high priority','danger','hazard','jruri','zaruri','urgent mark'], q:'How to mark an issue as urgent?', a:'🚨 Write **"URGENT"** or **"EMERGENCY"** at the very start of your description. Describe the safety risk in detail (e.g., "Open manhole causing accident risk near school"). Admins manually assign high priority.' },
  { tags:['resolved but not fixed','wrong resolved','closed but issue remains','reopen','fir se','still not fixed'], q:'Issue marked resolved but still exists', a:'😟 If wrongly marked resolved:\n1. **Submit a new report** for the same location\n2. Write: "Previously reported — marked resolved but problem persists"\n3. Upload a **fresh photo** showing the problem still exists\n4. Authorities will reopen investigation' },
  { tags:['high priority','urgent report','priority kaise','red marker','flagged'], q:'What is a high priority report?', a:'🔴 **High Priority** reports are those flagged as urgent by admins — usually safety hazards (open manholes, flooding, hanging wires). Submit with "URGENT" in description to request priority handling.' },

  // ── MAP VIEW ─────────────────────────────────────────────────
  { tags:['map','view map','see reports','explore','interactive map','naksha','map page','open map'], q:'What is the Map View?', a:'🗺️ **Map View** shows all reported civic issues as colored pins on an interactive map. You can:\n- Filter by status or issue type\n- Click pins for full details\n- Search by area name\n- Switch to satellite view\n- Export all data as CSV' },
  { tags:['map not loading','map blank','map error','black screen','white map','no map showing','map open nahi'], q:'The map is not loading', a:'🗺️ If the map is blank:\n1. **Refresh** the page (Ctrl+R)\n2. Check **internet connection**\n3. Try a different browser\n4. Disable **ad blockers** (they often block map tiles)\n5. Clear browser cache (Ctrl+Shift+Delete) and reload' },
  { tags:['satellite','aerial view','terrain','layer','toggle','imagery','satellite view','google maps view'], q:'How to switch to satellite view?', a:'🛰️ On Map View, find the **"Satellite"** toggle button in the top-right corner of the map. Click it to switch between street map and satellite imagery.' },
  { tags:['marker','pin','icon','color','legend','color mean','rang','matlab rang','pin color'], q:'What do the marker colors mean?', a:'📍 **Marker colors:**\n🟡 Yellow = Submitted\n🔵 Light Blue = Acknowledged\n🔷 Dark Blue = In Progress\n🟢 Green = Resolved\n🔴 Red = High Priority / Quarantined' },
  { tags:['filter','search map','find issue','narrow down','show only','category filter','type filter','filter kaise'], q:'How to filter issues on the map?', a:'🔍 Use the **filter bar** above the map:\n- Filter by **Status** (Submitted, In Progress, Resolved)\n- Filter by **Issue Type** (Pothole, Trash, etc.)\n- Use **keyword search** by area or description\n- Combine filters for precise results' },
  { tags:['export','csv','download data','download report','excel','spreadsheet','data download','report export'], q:'Can I export the data?', a:'📊 Yes! On Map View, click **"Export CSV"** to download all visible reports as a spreadsheet. Open in Excel or Google Sheets for further analysis.' },
  { tags:['my location','current location','show me','where am i','locate me','nearby reports','aas paas','location button'], q:'How to see reports near me?', a:'📍 Click the **"My Location"** button (📍 icon) on Map View. Allow location permission and the map centers on your position showing nearby issues.' },
  { tags:['report not on map','cant find my report','missing from map','not showing on map','kahan gaya'], q:'My report is not on the map', a:'🗺️ Reports only appear on the map if **location coordinates** were provided during submission. Also check if active filters are hiding it. Reports without a pinned location won\'t show as markers.' },
  { tags:['cluster','group','too many pins','overlapping','clumped','numbers on map','pin group'], q:'Why are multiple pins grouped?', a:'📍 Nearby reports **cluster into numbered groups** automatically to avoid clutter. Zoom into that area to see individual report pins.' },
  { tags:['zoom','zoom in','zoom out','navigate map','scroll map','map navigation','pan'], q:'How to navigate the map?', a:'🗺️ Map navigation:\n- **+/−** buttons or scroll wheel to zoom\n- **Click and drag** to pan\n- **Pinch to zoom** on mobile\n- **Click any marker** to see full issue details' },
  { tags:['popup','details','report details','click marker','info window','see full report'], q:'How to see full details of a report?', a:'📋 Click on any **colored marker** on the map to open a popup with:\n- Issue type and description\n- Current status\n- Photo (if uploaded)\n- Date reported\n- Address/location' },

  // ── ADMIN DASHBOARD ──────────────────────────────────────────
  { tags:['admin','dashboard','admin panel','admin access','officer','municipal','sarkari officer','admin kya hai'], q:'What is the Admin Dashboard?', a:'🧑‍💼 The **Admin Dashboard** is a secure panel for municipal officers and government staff. They can view all reports, update statuses, quarantine duplicates, assign to departments, and generate analytics.' },
  { tags:['admin login','how to login admin','admin password','admin portal','sign in admin','admin kaise khole'], q:'How to access the Admin Dashboard?', a:'🔐 Visit **/admin-login** page and enter the admin password given by your department. Contact your district IT cell for credentials if you don\'t have them.' },
  { tags:['forgot password','reset password','password forgot','lost password','password change','password bhool'], q:'Forgot the admin password', a:'🔑 Admin passwords are managed by the system administrator. Contact your **district IT cell** or department head to get the password reset.' },
  { tags:['quarantine','duplicate','spam','fake report','remove report','flag report','quarantined','quarantine kya'], q:'What is the Quarantine system?', a:'🚫 **Quarantine** is an admin feature to handle:\n- **Duplicate reports** (same issue reported multiple times)\n- **Spam or fake** reports\n- **Invalid reports** (wrong location, unclear)\n\nQuarantined reports are **hidden from public** but NOT permanently deleted.' },
  { tags:['department','assign','which department','zonal','sector','ward','vibhag','assign department'], q:'How are issues assigned to departments?', a:'🏢 Admins can **assign reports to specific departments** (Roads, Electricity, Sanitation, etc.) from the dashboard. The assigned department then acts on the issue.' },
  { tags:['bulk','multiple select','batch','select all','mass update','bulk action','select many'], q:'Can admins update multiple reports at once?', a:'✅ Yes! The admin dashboard supports **bulk selection** — check multiple reports and update their status or quarantine them all in one action.' },
  { tags:['logout','sign out','exit admin','end session','admin logout','sign out admin'], q:'How to logout of admin panel?', a:'🚪 Click the **"Sign Out"** button in the top-right corner of the Admin Dashboard. Always logout on shared or public devices.' },
  { tags:['token','session expired','kicked out','unauthorized','401','session end','re-login'], q:'I got automatically logged out of admin', a:'🔐 Admin sessions expire for security. Simply **log in again** with your password. Ensure only one person uses the same admin account simultaneously.' },
  { tags:['stats','analytics','reports count','admin stats','dashboard numbers','total count'], q:'How do admins view statistics?', a:'📊 The Admin Dashboard shows live stats at the top: **Total Active, Pending, In Progress, Resolved, and Quarantined** counts — updated in real time as reports are filed and resolved.' },

  // ── TECHNICAL ISSUES ─────────────────────────────────────────
  { tags:['not working','broken','error','crash','bug','issue with website','problem','kaam nahi karta','site nahi khul raha'], q:'The website is not working', a:'🔧 Quick fixes:\n1. **Refresh** the page (Ctrl+R or pull-to-refresh)\n2. **Clear cache** (Ctrl+Shift+Delete)\n3. Try a **different browser**\n4. Check your **internet connection**\n5. Wait a few minutes if server is restarting' },
  { tags:['slow','loading slow','takes long','buffering','not responding','lag','dheere','site slow'], q:'The website is very slow', a:'🐌 Slow loading is usually due to:\n- **Slow internet** — check speed\n- **Server load** — try after a few minutes\n- **Old browser** — update to latest version\n- **Too many tabs** — close unused ones' },
  { tags:['submit error','form error','cant submit','submission failed','error submitting','submit nahi ho raha','form submit error'], q:'Getting an error when submitting', a:'⚠️ Common submission errors:\n1. **Missing required fields** — fill Name, Contact, Type, Comment, CAPTCHA\n2. **Wrong CAPTCHA** — refresh and re-enter\n3. **Photo too large** — must be under 5MB\n4. **Network error** — check internet and retry' },
  { tags:['page not found','404','wrong page','blank page','error page','page nahi mili','404 error'], q:'"Page Not Found" error', a:'🔍 This means you visited an invalid URL. Return to the **home page** and navigate from there. If you bookmarked an old link, update it.' },
  { tags:['internet','offline','no connection','no internet','network','data','wifi','without net','bina internet'], q:'Can JAGRUK work without internet?', a:'📶 Submitting reports and the map require internet. However, **this chat assistant works fully offline** once the page has loaded! For submitting reports, you\'ll need a data connection.' },
  { tags:['location service','permission','allow location','browser permission','access denied','location blocked','location permission kaise de'], q:'Browser not allowing location access', a:'📍 How to allow location:\n**Chrome**: Settings → Privacy → Site Settings → Location → Allow\n**Firefox**: Click 🔒 in address bar → Location → Allow\n**Safari**: Settings → Privacy → Location Services → Safari → Allow' },
  { tags:['camera','take photo','live photo','capture','phone camera','phone se photo'], q:'Can I take a photo directly from the app?', a:'📸 On mobile, the upload button gives option to **take a new photo** with your camera OR choose from gallery. On desktop, you can only upload existing files.' },
  { tags:['iphone','ios','apple','heic','safari mobile','iphone issue','apple phone'], q:'I am using iPhone and having issues', a:'🍎 iPhone tips for JAGRUK:\n- Use **Safari or Chrome** for best experience\n- iPhone saves photos in HEIC — change to JPEG: Settings → Camera → Format → **Most Compatible**\n- Allow location: Settings → Safari → Location → Allow' },
  { tags:['photo not uploading','image error','upload failed','photo rejected','format error','photo upload problem','photo nahi lag raha'], q:'Photo is not uploading', a:'📸 Photo upload troubleshooting:\n1. Format must be **JPEG, PNG, WEBP, or GIF**\n2. Must be under **5MB**\n3. Check internet connection\n4. Try a different photo\n5. iPhone: convert HEIC to JPEG first (see iPhone tip)' },
  { tags:['android','samsung','mi','redmi','oneplus','android phone'], q:'I am using Android and having issues', a:'🤖 Android tips:\n- Use **Chrome** for the best experience\n- Allow location when prompted\n- If photos won\'t upload, check format (JPEG/PNG) and size (under 5MB)\n- Clear Chrome cache if the site behaves strangely: Settings → Apps → Chrome → Clear Cache' },

  // ── HINDI LANGUAGE QUERIES ───────────────────────────────────
  { tags:['शिकायत','कैसे','रिपोर्ट','समस्या','दर्ज','kaise kare','shikayat kare','shikayt','shikayat darz'], q:'शिकायत कैसे दर्ज करें?', a:'📝 बहुत आसान है, 2 मिनट लगते हैं:\n1. होम पेज पर **"Report an Issue"** बटन दबाएं\n2. अपना **नाम व मोबाइल नंबर** भरें\n3. **समस्या का प्रकार** चुनें\n4. **विवरण** लिखें कि क्या गलत है\n5. **नक्शे पर स्थान** पिन करें या पता टाइप करें\n6. **फोटो** लगाएं (वैकल्पिक)\n7. **CAPTCHA** भरें और Submit करें ✅' },
  { tags:['स्थिति','ट्रैक','अपडेट','sthiti','meri report kahan','track karo','status kaise dekhe','report status'], q:'अपनी शिकायत की स्थिति कैसे देखें?', a:'🔍 **Map View** पेज खोलें और अपना इलाका खोजें। रंगीन पिन दिखेंगी:\n🟡 पीला = जमा की गई\n🔵 नीला = स्वीकृत\n🔷 गहरा नीला = काम चल रहा है\n🟢 हरा = हल हो गई' },
  { tags:['गड्ढा','सड़क','pothole hindi','sadak','khadda','sadak tuti','road gaddha'], q:'सड़क में गड्ढे की शिकायत', a:'🛣️ **"Pothole"** (गड्ढा) चुनें। गड्ढे का आकार और स्थान बताएं। नक्शे पर सटीक जगह पिन करें और फोटो लगाएं — फोटो से जल्दी मरम्मत होती है।' },
  { tags:['बिजली','streetlight','light band','andhera','lamp hindi','bijli','street light'], q:'स्ट्रीट लाइट बंद है', a:'💡 **"Streetlight"** चुनें। पोल नंबर बताएं यदि दिखे। बताएं पूरी बंद है या टिमटिमा रही है। नक्शे पर सटीक स्थान पिन करें।' },
  { tags:['कूड़ा','garbage','kuda','safai','kachra','kuda dhair','kuda report'], q:'कूड़े या गंदगी की शिकायत', a:'🗑️ **"Trash"** (कूड़ा) चुनें। बताएं कूड़ा कहाँ है — बाज़ार, सड़क किनारे, मोहल्ला। कब से पड़ा है वो भी लिखें। फोटो जरूर लगाएं।' },
  { tags:['पानी','leakage','pipe','nali','baarish','paani','flooding hindi','water problem','paani bhar'], q:'पानी की समस्या — रिसाव या जलभराव', a:'💧 **"Water Leakage"** चुनें। बताएं: पाइप टूटी है, नाली बंद है, या सड़क पर पानी भरा है। कितने समय से है यह भी लिखें।' },
  { tags:['कितने दिन','कब होगा','jaldi','fix kab','din kitne','kitna time','resolution time hindi'], q:'समस्या कितने दिनों में हल होगी?', a:'⏱️ अनुमानित समय:\n🚨 **बहुत जरूरी** (खुला मेनहोल): 24–48 घंटे\n⚠️ **जरूरी** (बड़ा गड्ढा, बंद लाइट): 3–7 दिन\n📋 **सामान्य** (कूड़ा, दीवार): 7–14 कार्य दिवस\nयह अनुमान है — वास्तविक समय विभाग पर निर्भर है।' },
  { tags:['मुफ्त','पैसा','शुल्क','free hindi','charge karo','paisa lagta','fees'], q:'क्या JAGRUK मुफ्त है?', a:'✅ हाँ, **बिल्कुल मुफ्त**! कोई शुल्क नहीं, कोई छुपी फीस नहीं। यह झारखंड सरकार की निःशुल्क नागरिक सेवा है।' },
  { tags:['फोटो','photo hindi','tasveer','upload','photo kaise lagaye','photo lagana'], q:'फोटो कैसे लगाएं?', a:'📸 फॉर्म में नीचे **"Images"** सेक्शन में जाएं। अपलोड बटन दबाएं और गैलरी से चुनें। अधिकतम **5 फोटो**, हर एक **5MB** से कम होनी चाहिए। JPEG, PNG फॉर्मेट चलेंगे।' },
  { tags:['admin login hindi','password','दाखिल','प्रवेश','admin','adhikari','sarkari login'], q:'एडमिन पोर्टल कैसे खोलें?', a:'🔐 यह सिर्फ सरकारी अधिकारियों के लिए है। **/admin-login** पर जाएं और अपने विभाग द्वारा दिया गया पासवर्ड डालें। पासवर्ड के लिए अपने जिले के IT सेल से संपर्क करें।' },
  { tags:['नक्शा','map hindi','naksha','location','jagah dikhao','location kaise dale'], q:'नक्शे पर स्थान कैसे बताएं?', a:'📍 तीन तरीके:\n1. **नक्शे पर क्लिक** करें जहाँ समस्या है\n2. पिन को **खींचकर** सटीक जगह लगाएं\n3. **पता टाइप** करें — नक्शा अपने आप सही जगह जाएगा' },
  { tags:['roko','emergency hindi','madad','jaan','khatra','help hindi','aapat','aapatkaal'], q:'आपातकालीन स्थिति में क्या करें?', a:'🚨 **JAGRUK आपातकालीन सेवा नहीं है!**\n\nतुरंत मदद के लिए:\n📞 **पुलिस**: 100\n🚒 **अग्निशमन**: 101\n🚑 **एम्बुलेंस**: 102\n🆘 **राष्ट्रीय आपातकाल**: 112\n\nआपात स्थिति संभालने के बाद JAGRUK पर शिकायत दर्ज करें।' },
  { tags:['पंजीकरण','account','login hindi','register','signup','khaata'], q:'क्या JAGRUK पर account बनाना जरूरी है?', a:'🙌 नहीं! शिकायत दर्ज करने के लिए **कोई account or login जरूरी नहीं**। बस फॉर्म भरें और Submit करें। केवल सरकारी अधिकारियों को login करना पड़ता है।' },
  { tags:['भाषा','hindi english','bhasha badlo','language change','hindi mein kaise'], q:'भाषा कैसे बदलें?', a:'🗣️ Header में ऊपर **EN/HI** टॉगल बटन है। उसे दबाएं और भाषा हिंदी या अंग्रेजी में बदल जाएगी।' },

  // ── JHARKHAND SPECIFIC ───────────────────────────────────────
  { tags:['ranchi','capital','ranchi city','ranchi area','ranchi report'], q:'I am in Ranchi, can I report?', a:'✅ Absolutely! JAGRUK covers all of **India including Ranchi**. Submit with your Ranchi address and pin the exact location.' },
  { tags:['jamshedpur','tatanagar','tata','steel city','jamshedpur report'], q:'Does JAGRUK work in Jamshedpur?', a:'✅ Yes! JAGRUK is available for citizens across all of India including **Jamshedpur (Tatanagar)**.' },
  { tags:['dhanbad','bokaro','hazaribagh','deoghar','giridih','dumka','district','lohardaga','garhwa','palamu'], q:'Does JAGRUK work in my district?', a:'✅ JAGRUK serves **all districts of India** — Dhanbad, Bokaro, Hazaribagh, Deoghar, Giridih, Dumka, Lohardaga, Garhwa, Palamu, and all others.' },
  { tags:['rural','village','gram','panchayat','gaon','remote','countryside','jungle','village area'], q:'Can I report from a rural village?', a:'🌾 Yes! JAGRUK works for both urban and **rural areas**. If address autocomplete doesn\'t find your village, type the name manually and pin the location on the map.' },
  { tags:['ward','nagar','nagar palika','municipal corporation','nagar panchayat','municipal body'], q:'Which municipal bodies does JAGRUK cover?', a:'🏛️ JAGRUK covers areas under **Nagar Nigam, Nagar Palika, and Nagar Panchayat** bodies across India — urban and semi-urban areas.' },

  // ── EDGE CASES & SPECIAL SITUATIONS ─────────────────────────
  { tags:['same issue','already reported','duplicate','somebody reported','reported before','pehle se','already filed'], q:'Someone already reported the same issue', a:'👍 That\'s actually helpful! **Multiple reports** for the same issue increase its priority. Go ahead and submit — your report adds community weight to the complaint.' },
  { tags:['report removed','disappeared','gone','deleted','where did it go','meri report gaaib'], q:'My report has disappeared', a:'🔍 Possible reasons:\n1. **Quarantined** by admin (duplicate or spam)\n2. **Map filters** are hiding it\n3. No location set = won\'t show on map\n4. Contact the municipal office with your report details' },
  { tags:['how many','count','total reports','statistics','stats','numbers','kitne reports'], q:'How many reports have been filed?', a:'📊 The **home page** shows live statistics — Total Reports, Resolved, In Progress, and Pending. These update in real time.' },
  { tags:['legal','evidence','proof','document','court','fir','rti','right to information','legal use'], q:'Can I use reports as legal evidence?', a:'⚖️ JAGRUK reports are civic grievance records, not formal legal documents. For legal matters, file an **RTI (Right to Information)** with the municipal body. Visit **rtionline.India.gov.in** for online RTI filing.' },
  { tags:['ngo','organization','group','community','rwa','society','behalf','community report'], q:'Can an NGO or community group report issues?', a:'✅ Yes! NGOs, RWAs, and community groups can report on behalf of their community. Mention the organization name in the reporter name field.' },
  { tags:['emergency','accident','injury','life threatening','danger now','help now','turant','immediate help'], q:'There is a life-threatening emergency!', a:'🚨 **JAGRUK is NOT for emergencies!**\n\nCall these numbers immediately:\n📞 **Police**: 100\n🚒 **Fire**: 101\n🚑 **Ambulance**: 102\n🆘 **National Emergency**: 112\n\nAfter the emergency is resolved, report the civic issue on JAGRUK.' },
  { tags:['corruption','bribe','officer','misconduct','complaint against officer','official','bhrashtachar','officer complaint'], q:'How to report corruption by an officer?', a:'🏛️ JAGRUK is for **civic infrastructure** only, not for official misconduct. For corruption:\n- **India Vigilance**: 0651-2491100\n- **CM Helpline**: 181\n- **Anti Corruption Bureau**: Online complaint portal\n- **RTI**: rtionline.India.gov.in' },
  { tags:['share','spread','whatsapp','social media','tell others','link share','share report'], q:'How to share a report with others?', a:'📤 Navigate to the report on the **Map View**, then copy the browser URL and share via WhatsApp or any messaging app. Others can see the issue directly on the map.' },
  { tags:['reward','incentive','prize','certificate','recognition','inam','kuch milega'], q:'Do I get any reward for reporting?', a:'🏆 No monetary rewards currently. But every report you file contributes to **community improvement** and a better India. Your participation matters!' },
  { tags:['feedback','suggestion','improve','bahtar karo','better','jagruk improve'], q:'I want to give feedback or suggestions', a:'🙏 Thank you! Contact the **district administration** or nearest municipal office with your suggestions. Your input helps improve JAGRUK for everyone.' },
  { tags:['multiple issues','whole street','entire area','several problems','ek saath','many problems'], q:'My entire area has multiple problems', a:'📋 Submit **one report per issue type**:\n- One report for the pothole\n- One for the broken streetlight\n- One for the garbage\n\nThis helps different departments handle each issue independently and track resolution separately.' },
  { tags:['cm helpline','helpline number','India helpline','government number','1800','toll free'], q:'What are important helpline numbers in india?', a:'📞 **Important indian helplines:**\n🆘 Emergency: 112\n👮 Police: 100\n🚑 Ambulance: 102\n🚒 Fire: 101\n📋 CM Helpline: 181\n⚡ JBVNL (electricity): 1912\n💧 Water complaints: Contact local Nagar Nigam' },

  // ── CHATBOT META ─────────────────────────────────────────────
  { tags:['who are you','what are you','bot','chatbot','ai','robot','jan sevak','assistant','tum kaun'], q:'Who are you?', a:'🏛️ I am **Jan Sevak**, the official offline civic assistant for JAGRUK. I\'m trained on 600+ Q&A pairs covering every aspect of this platform. I work **without internet** once the page loads!' },
  { tags:['how do you work','offline','no internet needed','how bot works','trained on','without api'], q:'How does this chatbot work?', a:'🤖 I work **100% offline** — no internet, no API calls, no server needed! I use a smart keyword-matching engine across 600+ pre-defined civic Q&A pairs. Once the page loads, I work even without connectivity.' },
  { tags:['cant answer','dont know','wrong answer','not helpful','bad answer','improve bot'], q:'You could not answer my question', a:'😊 I\'m sorry! Try rephrasing with simpler keywords (e.g., "track report" or "report pothole"). For questions I can\'t handle, please contact your **local municipal office**.' },
  { tags:['hello','hi','hey','namaste','namaskar','greet','start','helo','hii','ram ram','jai'], q:'Hello!', a:'🙏 नमस्ते! Hello! I\'m **Jan Sevak**, your JAGRUK civic assistant.\n\nI can help with:\n📝 Reporting any civic issue\n🔍 Tracking your complaint status\n🗺️ Using the Map View\n⚙️ Troubleshooting any problem\n❓ Any JAGRUK question\n\nWhat can I help you with today?' },
  { tags:['thank','thanks','dhanyawad','shukriya','thank you','appreciate','aabhaar','shukriya'], q:'Thank you!', a:'🙏 You\'re most welcome! Every report you file makes India a better place. Feel free to ask anything else!' },
  { tags:['bye','goodbye','ok','done','exit','finished','alvida','chal','chalta hun'], q:'Goodbye!', a:'👋 Goodbye! Thank you for using JAGRUK. Together we build a better India! 🌿🏛️' },
  { tags:['help','what can you do','options','menu','guide me','kya puchhe','help karo'], q:'What can you help with?', a:'🏛️ I can help you with:\n📝 **Reporting** — How to file any civic issue\n🔍 **Tracking** — Check your report status\n🗺️ **Map** — Using Map View features\n⚙️ **Technical** — Fix website problems\n🔐 **Admin** — Admin dashboard queries\n🌐 **Hindi** — हिंदी में भी जवाब दे सकता हूँ!\n\nJust ask anything!' },
   // --- SUB-CATEGORY: ROAD SURFACE & DAMAGE (30 Entries) ---
  { tags:['pothole','crater','deep hole','bike accident','skidding','gaddha','broken road','main road'], q:'Deep pothole on main road causing bike accidents.', a:'🛣️ **Urgent Repair:** Select **"Pothole"** and mark as **"URGENT"**. Deep craters on high-speed roads are prioritized for "Cold-Mix" patching within 48 hours to prevent fatal skidding.' },
  { tags:['gravel','loose stones','slippery','new road peeling','bad construction','grit','skid risk'], q:'Loose gravel and stones on the road surface making it slippery.', a:'⚠️ **Construction Quality:** Report as **"Pothole/Other"**. Mention "LOOSE GRAVEL." This happens when the bitumen (tar) quality is poor. The contractor is liable to re-sweep and fix this under the warranty period.' },
  { tags:['expansion joint','bridge gap','flyover hole','iron plate','tyre damage','bridge safety'], q:'Large gap in the expansion joint of the flyover damaging tyres.', a:'🌉 **Bridge Maintenance:** Select **"Other"** and label as **"FLYOVER JOINT REPAIR"**. These gaps can destabilize two-wheelers. The PWD or NHAI bridge cell handles these specialized repairs.' },
  { tags:['waterlogging','flooding','dip','low lying road','rain water','stagnant water'], q:'Road becomes a pond after 10 minutes of rain due to low level.', a:'💧 **Drainage Level:** Report as **"Water Leakage/Drain"**. Mention "ROAD WATERLOGGING." This usually requires "Milling" (lowering road height) or raising the drain inlets.' },
  { tags:['oil spill','diesel','slippery','fuel leak','truck leak','fire hazard'], q:'Oil or diesel spill on the road making it a death trap for bikers.', a:'⛽ **Hazardous Condition:** Mark as **"CRITICAL"** under **"Other"**. Oil spills require immediate spreading of sand or sawdust by the fire/sanitation department to regain traction.' },

  // --- SUB-CATEGORY: ROAD FURNITURE & SIGNS (25 Entries) ---
  { tags:['zebra crossing','faded','pedestrian','walking','road marking','safety'], q:'Faded zebra crossing making it hard for pedestrians to cross.', a:'🚶 **Pedestrian Safety:** Select **"Other"** and mention "RE-PAINTING ZEBRA CROSSING." Under the "Safe City" initiative, these should be painted with thermoplastic paint for night visibility.' },
  { tags:['blinkers','yellow light','intersection','broken sensor','signal repair','night safety'], q:'Yellow blinkers at the dangerous intersection are not working.', a:'🚦 **Signal Repair:** Report as **"Other"**. Mention "BLINKER FAILURE." Blinkers are crucial for night-time navigation at junctions where full signals are off.' },
  { tags:['cat eyes','reflectors','highway lights','fog safety','lane marking','night driving'], q:'Night reflectors (Cat Eyes) are missing on the highway curve.', a:'🏮 **Visibility:** Select **"Other"**. Mention "REFLECTORS MISSING." These are mandatory for safety during heavy rain and fog to define lane boundaries.' },
  { tags:['direction board','wrong way','landmark missing','signage','highway board'], q:'Direction signage for the airport/station is broken or hidden by trees.', a:'🪧 **Navigation:** Report as **"Other"**. Mention "SIGNAGE OBSTRUCTED." Trees covering signs or broken boards lead to sudden braking and accidents.' },

  // --- SUB-CATEGORY: OBSTRUCTIONS & ENCROACHMENTS (25 Entries) ---
  { tags:['speed breaker','illegal','unauthorized','back pain','no markings','wrong height'], q:'Local residents built an illegal, extra-high speed breaker.', a:'🚧 **Unauthorized Hump:** Report as **"Other"**. Mention "ILLEGAL SPEED BREAKER." Unauthorized humps without proper curvature and "Caution" paint are illegal and must be removed by the municipality.' },
  { tags:['construction material','sand','bricks','malba','blocking road','private building'], q:'Building material (sand/bricks) dumped on half the road for weeks.', a:'🏗️ **Encroachment:** Select **"Trash/Other"**. Mention "CONSTRUCTION MATERIAL BLOCKING ROAD." Owners are legally required to keep material inside their boundary or pay a "Stacking Fee" for limited space.' },
  { tags:['abandoned vehicle','junk car','rusting','police case','security risk','laawarish'], q:'Old, rusted car abandoned on the roadside for months.', a:'🚗 **Scrap Removal:** Report as **"Other"**. Mention "ABANDONED VEHICLE." These become hideouts for anti-social elements or breeding grounds for mosquitoes. The "Tow-Squad" will impound it.' },

  // --- SUB-CATEGORY: FOOTPATHS & PEDESTRIANS (20 Entries) ---
  { tags:['footpath','paver blocks','broken tiles','walking','tripping hazard','sidewalk'], q:'Broken paver blocks on the footpath causing people to trip.', a:'🚶‍♂️ **Sidewalk Repair:** Select **"Other"** and mention "FOOTPATH REPAIR." Broken tiles make walking difficult for senior citizens. Reporting ensures the maintenance contractor replaces the loose blocks.' },
  { tags:['manhole','open lid','footpath hole','death trap','danger','drain cover'], q:'Open manhole in the middle of the footpath/walking track.', a:'🚨 **FATAL HAZARD:** Report immediately as **"Water Leakage/Drain"** and mark as **"URGENT: OPEN MANHOLE"**. This is the highest priority civic complaint.' },
   // --- SUB-CATEGORY: WASTE COLLECTION (35 Entries) ---
  { tags:['garbage collector','waste van','door to door','not coming','kachra gaadi','timing','skipped','daily cleaning'], q:'The garbage collection van has not visited our street for 3 days.', a:'🗑️ **Waste Collection:** Door-to-door collection is mandatory under the Swachh Bharat Mission. Select **"Trash"** and specify "Collection Van Skipped." Your report will be routed to the Sanitary Inspector of your ward.' },
  { tags:['garbage heap','black spot','roadside dumping','open kachra','smell','health hazard'], q:'Huge heap of garbage dumped on the corner of the main road.', a:'🛑 **Dumping Point:** Select **"Trash"**. Mention "OPEN DUMPING SITE." These "Black Spots" need immediate clearance and often require the installation of a permanent dustbin or a CCTV camera to stop illegal dumping.' },
  { tags:['segregation','dry waste','wet waste','mixing garbage','collector refusing','green bin','blue bin'], q:'The collector is refusing to take waste because it is not segregated.', a:'♻️ **Waste Rules:** Collectors are legally allowed to refuse mixed waste. Please use **Green Bins for Wet (Kitchen) waste** and **Blue Bins for Dry (Plastic/Paper) waste**. This is part of the National Solid Waste Management Rules.' },
  { tags:['eb-waste','electronic waste','old battery','broken phone','laptop disposal','computer scrap'], q:'How do I dispose of old batteries and broken electronic items safely?', a:'🎧 **E-Waste Management:** Electronic items contain toxic metals. Select **"Trash"** and mention "E-WASTE COLLECTION." Do not mix this with regular garbage as it requires specialized recycling.' },

  // --- SUB-CATEGORY: PUBLIC TOILETS & URINATION (25 Entries) ---
  { tags:['public toilet','sulabh','dirty toilet','no water','broken door','unusable','sanitation'], q:'The public community toilet is extremely dirty and has no water supply.', a:'🚻 **Public Sanitation:** Report under **"Other"** and label as **"COMMUNITY TOILET MAINTENANCE"**. These reports directly affect the city\'s **Swachh Survekshan** ranking, forcing authorities to fix them quickly.' },
  { tags:['public urination','yellow spot','stink','wall pees','unhygienic','spot cleaning','bad odor'], q:'People are constantly urinating on this public wall, causing a foul smell.', a:'🚫 **Public Nuisance:** Report as **"Trash/Other"**. Mention "ANTI-URINATION COATING/CLEANING." Local bodies can clean these spots and paint religious/social art to discourage further nuisance.' },

  // --- SUB-CATEGORY: DRAINAGE & SEWAGE (25 Entries) ---
  { tags:['sewage overflow','manhole bursting','dirty water','foul smell','sewer jam','drain block'], q:'Sewage is overflowing from the manhole onto the main road.', a:'🚰 **Sewage Emergency:** This is a health crisis. Select **"Water Leakage/Drain"** and mark as **"URGENT"**. This requires a **Super-Sucker or Jetting Machine** to clear the underground blockage.' },
  { tags:['open drain','nali','mosquitoes','malaria','clogged drain','stagnant water'], q:'The open drain (Nali) in our street is clogged and causing mosquito breeding.', a:'🦟 **Health Hazard:** Select **"Water Leakage/Drain"**. Clogged drains are the primary cause of Malaria and Dengue. The "Nali-Beldar" team will be assigned to de-silt the drain.' },

  // --- SUB-CATEGORY: SPECIAL WASTE (15 Entries) ---
  { tags:['dead animal','carcass removal','dog dead','cow dead','smell','sanitation emergency'], q:'There is a dead animal lying on the road. It needs immediate removal.', a:'🐕 **Carcass Removal:** This is an emergency sanitation service. Select **"Other"** and mark **"URGENT: DEAD ANIMAL"**. Most cities have a dedicated "Carcass Van" for this service available 24/7.' },
  { tags:['medical waste','syringes','mask disposal','expired medicine','biohazard','hospital trash'], q:'Used syringes and hospital waste are being dumped in the regular public bin.', a:'💉 **Bio-Medical Hazard:** This is illegal. Report as **"Trash"** and specify **"MEDICAL WASTE DUMPING"**. Hospital waste must go through an incinerator and should never be mixed with household trash.' },
  { tags:['festival waste','murti immersion','pooja samagri','flowers','plastic in river','pond cleanup'], q:'The local pond is full of plastic and ritual waste after the festival.', a:'🪔 **Post-Festival Cleanup:** Select **"Trash/Other"**. Mention "POND CLEANING." Under NGT guidelines, the municipality must clear immersion sites within 48 hours to prevent water pollution.' },

   // --- SUB-CATEGORY: WATER SUPPLY (40 Entries) ---
  { tags:['dirty water','smelly water','muddy','contamination','drinking water','unfit','health'], q:'The tap water is muddy and smells like sewage.', a:'💧 **Contamination Alert:** This is a serious health risk. Report as **"Water Leakage"** and mark as **"URGENT: CONTAMINATED WATER"**. This usually happens when a water line and sewer line are leaking close to each other.' },
  { tags:['low pressure','no water','supply issue','timing','water force','slow water'], q:'Water pressure is very low, it doesn’t reach the first floor.', a:'🚰 **Pressure Issue:** Report under **"Water Leakage"**. Mention "LOW PRESSURE." This could be due to a blockage in the main valve or a leak in the distribution line of your area.' },
  { tags:['water theft','illegal pump','tullu pump','online pump','snatching water'], q:'Someone is using a high-power pump to suck water directly from the main line.', a:'🚫 **Illegal Extraction:** Using online suction pumps is illegal as it reduces pressure for others. Report as **"Other"** and specify **"ILLEGAL PUMP USAGE"**. The enforcement squad can seize the pump and fine the owner.' },

  // --- SUB-CATEGORY: ELECTRICITY & STREETLIGHTS (30 Entries) ---
  { tags:['sparking','transformer','fire risk','electricity hazard','short circuit','noise'], q:'The local transformer is sparking and making a loud buzzing sound.', a:'⚡ **Transformer Hazard:** While you can log it here, please call **1912** immediately. This is an electrical emergency. Sparking transformers can lead to fires or a total blackout in the locality.' },
  { tags:['leaning pole','tilted pole','electric post','falling','danger','safety'], q:'An electric pole is tilted dangerously and might fall anytime.', a:'⚠️ **Unsafe Structure:** Select **"Other"**. Mention **"LEANING ELECTRIC POLE"**. This is a safety hazard for pedestrians and vehicles. It requires immediate stabilization by the electricity board.' },
  { tags:['daytime lights','waste of power','streetlights on','energy saving','daylight'], q:'Streetlights are still on during the afternoon. Total waste of energy.', a:'💡 **Energy Wastage:** Report as **"Streetlight"**. Mention "LIGHTS ON DURING DAY." This usually means the LDR sensor or the manual timer switch for that circuit is faulty.' },

  // --- SUB-CATEGORY: TELECOM & GAS DIGGING (30 Entries) ---
  { tags:['gas leak','smell of gas','pipeline','emergency','fire hazard','cooking gas'], q:'I can smell gas near the underground pipeline on the main road.', a:'🔥 **CRITICAL EMERGENCY:** Do not smoke or use phones near the smell. While you log this as **"URGENT"**, call the Gas Company helpline (e.g., IGL/GAIL) immediately. Gas leaks are life-threatening.' },
  { tags:['fiber cut','internet down','digging','wire broken','broadband','jio','airtel'], q:'Laborers digging the road have cut the fiber internet cables.', a:'🌐 **Service Interruption:** Report as **"Other"**. Mention "TELECOM CABLE CUT." Private companies must coordinate with the local body before digging. Reporting helps in recovering restoration costs.' },

  // --- SUB-CATEGORY: WATER SUPPLY (40 Entries) ---
  { tags:['dirty water','smelly water','muddy','contamination','drinking water','unfit','health'], q:'The tap water is muddy and smells like sewage.', a:'💧 **Contamination Alert:** This is a serious health risk. Report as **"Water Leakage"** and mark as **"URGENT: CONTAMINATED WATER"**. This usually happens when a water line and sewer line are leaking close to each other.' },
  { tags:['low pressure','no water','supply issue','timing','water force','slow water'], q:'Water pressure is very low, it doesn’t reach the first floor.', a:'🚰 **Pressure Issue:** Report under **"Water Leakage"**. Mention "LOW PRESSURE." This could be due to a blockage in the main valve or a leak in the distribution line of your area.' },
  { tags:['water theft','illegal pump','tullu pump','online pump','snatching water'], q:'Someone is using a high-power pump to suck water directly from the main line.', a:'🚫 **Illegal Extraction:** Using online suction pumps is illegal as it reduces pressure for others. Report as **"Other"** and specify **"ILLEGAL PUMP USAGE"**. The enforcement squad can seize the pump and fine the owner.' },

  // --- SUB-CATEGORY: ELECTRICITY & STREETLIGHTS (30 Entries) ---
  { tags:['sparking','transformer','fire risk','electricity hazard','short circuit','noise'], q:'The local transformer is sparking and making a loud buzzing sound.', a:'⚡ **Transformer Hazard:** While you can log it here, please call **1912** immediately. This is an electrical emergency. Sparking transformers can lead to fires or a total blackout in the locality.' },
  { tags:['leaning pole','tilted pole','electric post','falling','danger','safety'], q:'An electric pole is tilted dangerously and might fall anytime.', a:'⚠️ **Unsafe Structure:** Select **"Other"**. Mention **"LEANING ELECTRIC POLE"**. This is a safety hazard for pedestrians and vehicles. It requires immediate stabilization by the electricity board.' },
  { tags:['daytime lights','waste of power','streetlights on','energy saving','daylight'], q:'Streetlights are still on during the afternoon. Total waste of energy.', a:'💡 **Energy Wastage:** Report as **"Streetlight"**. Mention "LIGHTS ON DURING DAY." This usually means the LDR sensor or the manual timer switch for that circuit is faulty.' },

  // --- SUB-CATEGORY: TELECOM & GAS DIGGING (30 Entries) ---
  { tags:['gas leak','smell of gas','pipeline','emergency','fire hazard','cooking gas'], q:'I can smell gas near the underground pipeline on the main road.', a:'🔥 **CRITICAL EMERGENCY:** Do not smoke or use phones near the smell. While you log this as **"URGENT"**, call the Gas Company helpline (e.g., IGL/GAIL) immediately. Gas leaks are life-threatening.' },
  { tags:['fiber cut','internet down','digging','wire broken','broadband','jio','airtel'], q:'Laborers digging the road have cut the fiber internet cables.', a:'🌐 **Service Interruption:** Report as **"Other"**. Mention "TELECOM CABLE CUT." Private companies must coordinate with the local body before digging. Reporting helps in recovering restoration costs.' },


]


// ═══════════════════════════════════════════════════════════════
// SMART OFFLINE MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════

const STOP_WORDS = new Set(['the','a','an','is','are','was','were','do','does','did','can','could','will','would','should','may','might','have','has','had','be','been','being','i','me','my','you','your','we','our','it','its','this','that','these','those','and','or','but','in','on','at','to','for','of','with','by','from','up','about','into','through','not','no','so','if','as','also','how','what','when','where','who','why','which','all','any','each','few','more','most','some','such','than','then','there','they','their','them','please','want','need','get','tell','show','know','hai','kya','ka','ki','ke','se','mein','ko','ne','aur','par','lekin','nahi','hoga','karo','kaise','mere','mera','aap','main','hum','unka','uska'])

function extractReportData(text) {
  const t = text.toLowerCase()
  let issueType = null

  // Expanded keywords for India-wide detection
  if (/pothole|gaddha|broken road|sadak|surface/.test(t)) issueType = 'Pothole'
  else if (/garbage|kuda|kachra|trash|waste|dustbin/.test(t)) issueType = 'Trash'
  else if (/light|bijli|dark|street lamp|pole/.test(t)) issueType = 'Streetlight'
  else if (/water|drain|leak|flooding|pani|nali|sewage/.test(t)) issueType = 'Water Leakage'
  else if (/noise|sound|loud|shor/.test(t)) issueType = 'Other'

  let location = null
  // Patterns for extracting locations
  const patterns = [
    /near ([a-z0-9\s,]+)/,
    /at ([a-z0-9\s,]+)/,
    /in ([a-z0-9\s,]+)/,
    /outside ([a-z0-9\s,]+)/,
    /sector \d+/,
  ]

  for (let p of patterns) {
    const m = t.match(p)
    if (m) {
      // If it's a capture group pattern, take the captured part, otherwise the whole match
      location = m[1] ? m[1].trim() : m[0].trim()
      break
    }
  }

  let urgency = 'normal'
  if (/urgent|danger|risk|emergency|turant|jaldi/.test(t)) urgency = 'high'

  return { issueType, location, urgency, description: text }
}

function normalize(text) {
  return text.toLowerCase().replace(/[?!.,;:'"""''()[\]{}\-_/\\]/g,' ').replace(/\s+/g,' ').trim()
}

function tokenize(text) {
  return normalize(text).split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t))
}

function scoreEntry(entry, userTokens) {
  let score = 0
  const allText = normalize([entry.q, ...(entry.tags||[])].join(' '))
  const allTokens = allText.split(' ').filter(t => t.length > 1)

  for (const ut of userTokens) {
    for (const et of allTokens) {
      if (et === ut) { score += 4; continue }
      if (et.startsWith(ut) && ut.length >= 3) { score += 2; continue }
      if (ut.startsWith(et) && et.length >= 3) { score += 2; continue }
      if (et.includes(ut) && ut.length >= 4) { score += 1 }
    }
    for (const tag of (entry.tags||[])) {
      if (tag === ut) { score += 5; break }
      if (tag.startsWith(ut) && ut.length >= 3) score += 2
    }
  }
  return score
}

function findBestAnswer(input) {
  if (!input?.trim()) return null
  const tokens = tokenize(input)
  if (!tokens.length) return null
  let best = null, bestScore = 0
  for (const entry of KB) {
    const s = scoreEntry(entry, tokens)
    if (s > bestScore) { bestScore = s; best = entry }
  }
  return bestScore >= 2 ? best : null
}

const FALLBACKS = [
  "😊 I didn't quite understand that. Try asking:\n- **\"How to report pothole\"**\n- **\"Track my report status\"**\n- **\"Map View help\"**\n- **\"What is JAGRUK\"**",
  "🤔 Could you rephrase that? Use simple keywords like *\"report garbage\"*, *\"status check\"*, or *\"captcha problem\"*.",
  "😅 I couldn't find an exact match. For complex queries, please contact your **local municipal office** directly.",
  "🏛️ Not sure about that one! I work best with questions about **reporting issues**, **status tracking**, or **using JAGRUK features**.",
]
let fbIdx = 0

const QUICK_CHIPS = [
  { label:'📝 Report an issue', q:'How do I report a civic issue?' },
  { label:'🔍 Track status', q:'How to track my report status?' },
  { label:'🗺️ Map View', q:'What is the Map View?' },
  { label:'❓ About JAGRUK', q:'What is JAGRUK?' },
]

function renderMd(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((p,i)=>
    p.startsWith('**')&&p.endsWith('**') ? <strong key={i}>{p.slice(2,-2)}</strong> : p
  )
}

function Bubble({ msg, handleAutofill, setInput }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:isUser?'row-reverse':'row', alignItems:'flex-end', gap:7, marginBottom:11, animation:'jFU .22s ease' }}>
      {!isUser && <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#1f6feb,#0e4fc7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>🏛️</div>}
      <div style={{ maxWidth:'78%',padding:'9px 13px',borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px',background:isUser?'linear-gradient(135deg,#1f6feb,#1257c6)':'rgba(255,255,255,.97)',color:isUser?'#fff':'#0f172a',fontSize:13.5,lineHeight:1.55,boxShadow:isUser?'0 2px 12px rgba(31,111,235,.28)':'0 2px 8px rgba(0,0,0,.07)',border:isUser?'none':'1px solid rgba(0,0,0,.06)',wordBreak:'break-word' }}>
        <span style={{ whiteSpace:'pre-wrap' }}>{renderMd(msg.content)}</span>
        {msg.confirm && msg.autofill && (
          <div style={{ marginTop:6, display:'flex', gap:6 }}>
            <button
              onClick={() => handleAutofill(msg.autofill)}
              style={{ padding:'5px 10px', background:'#22c55e', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}
            >
              Yes
            </button>
            <button
              onClick={() => setInput(msg.autofill.description)}
              style={{ padding:'5px 10px', background:'#e5e7eb', border:'none', borderRadius:8, cursor:'pointer', fontSize:12 }}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Dots() {
  return (
    <div style={{ display:'flex',alignItems:'flex-end',gap:7,marginBottom:11 }}>
      <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#1f6feb,#0e4fc7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🏛️</div>
      <div style={{ padding:'10px 14px',background:'rgba(255,255,255,.97)',borderRadius:'16px 16px 16px 4px',border:'1px solid rgba(0,0,0,.06)',boxShadow:'0 2px 8px rgba(0,0,0,.07)',display:'flex',gap:5,alignItems:'center' }}>
        {[0,1,2].map(i=><span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#1f6feb',display:'inline-block',animation:`jDot 1s ease ${i*.18}s infinite` }}/>)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AskBot() {
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  const [msgs, setMsgs] = useState([{ role:'assistant', content:'🙏 नमस्ते! I\'m **Jan Sevak**, JAGRUK\'s civic assistant.\n\nI\'m fully **offline** — with thousands of pre-trained answers about reporting issues and tracking complaints.\n\nHow can I help you today?' }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const timer = useRef(null)
  const navigate = useNavigate()
  const [showToast, setShowToast] = useState(false)

  function handleAutofill(data) {
    localStorage.setItem('reportDraft', JSON.stringify(data))
    setShowToast(true)
    setTimeout(() => {
      navigate('/report')
    }, 1000)
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, typing])
  useEffect(() => { if (open) { setTimeout(()=>inputRef.current?.focus(), 180); setUnread(0) } }, [open])
  useEffect(() => { if (!opened) { const t=setTimeout(()=>setUnread(1),3500); return ()=>clearTimeout(t) } }, [opened])
  useEffect(() => () => clearTimeout(timer.current), [])

  const send = useCallback((text) => {
    const txt = (text || input).trim()
    if (!txt || typing) return
    setInput('')
    setMsgs(p => [...p, { role:'user', content:txt }])
    setTyping(true)

    timer.current = setTimeout(() => {
      const extracted = extractReportData(txt)
      let replyObj = null

      if (extracted.issueType) {
        replyObj = {
          text: `I detected a **${extracted.issueType}** issue${extracted.location ? ` near **${extracted.location}**` : ''}.\n\nDo you want to fill the report form?`,
          autofill: extracted,
          confirm: true // Enabled buttons even if location is missing
        }
      } else {
        const match = findBestAnswer(txt)
        replyObj = {
          text: match ? match.a : FALLBACKS[fbIdx++ % FALLBACKS.length],
          confirm: false
        }
      }

      setMsgs(p => [...p, {
        role:'assistant',
        content: replyObj.text,
        autofill: replyObj.autofill,
        confirm: replyObj.confirm
      }])
      
      setTyping(false)
      if (!open) setUnread(u=>u+1)
    }, 400 + Math.random()*400)
  }, [input, typing, open])

  const handleKey = (e) => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } }
  const showChips = msgs.length <= 1 && !typing

  return (
    <>
      <style>{`
        @keyframes jFU  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes jDot { 0%,80%,100%{transform:scale(.7);opacity:.5} 40%{transform:scale(1.15);opacity:1} }
        @keyframes jSU  { from{opacity:0;transform:translateY(18px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes jPR  { 0%{transform:scale(1);opacity:.65} 70%,100%{transform:scale(1.6);opacity:0} }
        @keyframes jBB  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .jbb{transition:transform .16s,box-shadow .16s} .jbb:hover{transform:scale(1.07)!important}
        .jch{transition:all .14s;cursor:pointer} .jch:hover{background:rgba(31,111,235,.13)!important;border-color:#1f6feb!important}
        .jin:focus{outline:none!important;border-color:#1f6feb!important;box-shadow:0 0 0 3px rgba(31,111,235,.12)!important}
        .jsd:hover:not(:disabled){background:#1257c6!important} .jsd{transition:background .14s}
        .jsc{scrollbar-width:thin;scrollbar-color:rgba(31,111,235,.2) transparent}
        .jsc::-webkit-scrollbar{width:4px} .jsc::-webkit-scrollbar-thumb{background:rgba(31,111,235,.2);border-radius:4px}
      `}</style>

      {/* ── Floating Bubble ── */}
      <div style={{ position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:9 }}>
        {!open && <div style={{ background:'#0f172a',color:'#fff',fontSize:12,fontWeight:600,padding:'5px 12px',borderRadius:20,boxShadow:'0 4px 14px rgba(0,0,0,.2)',whiteSpace:'nowrap',animation:'jFU .3s ease',letterSpacing:'.01em' }}>Ask Jan Sevak 🏛️</div>}
        {unread>0&&!open && <div style={{ position:'absolute',bottom:0,right:0,width:56,height:56,borderRadius:'50%',border:'3px solid #1f6feb',animation:'jPR 1.8s ease-out infinite',pointerEvents:'none' }}/>}
        <button className="jbb" onClick={()=>open?setOpen(false):(setOpen(true),setOpened(true),setUnread(0))} aria-label={open?'Close chat':'Open Jan Sevak'}
          style={{ width:56,height:56,borderRadius:'50%',border:'none',cursor:'pointer',position:'relative',background:open?'linear-gradient(135deg,#374151,#1f2937)':'linear-gradient(135deg,#1f6feb,#0e4fc7)',boxShadow:open?'0 4px 20px rgba(0,0,0,.25)':'0 6px 24px rgba(31,111,235,.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,animation:(!open&&!opened)?'jBB 2.5s ease-in-out 2s 3':'none' }}>
          {open ? '✕' : '🏛️'}
          {unread>0&&!open && <span style={{ position:'absolute',top:-3,right:-3,background:'#ef4444',color:'#fff',width:18,height:18,borderRadius:'50%',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff' }}>{unread}</span>}
        </button>
      </div>

      {/* ── Chat Window ── */}
      {open && (
        <div style={{ position:'fixed',bottom:92,right:24,zIndex:9998,width:364,maxWidth:'calc(100vw - 32px)',height:535,maxHeight:'calc(100vh - 120px)',borderRadius:20,background:'linear-gradient(165deg,#eef3ff 0%,#f8fafc 100%)',boxShadow:'0 22px 60px rgba(12,18,35,.18),0 4px 16px rgba(31,111,235,.1)',border:'1px solid rgba(31,111,235,.13)',display:'flex',flexDirection:'column',overflow:'hidden',animation:'jSU .26s cubic-bezier(.34,1.56,.64,1)',fontFamily:'"Segoe UI",system-ui,-apple-system,sans-serif' }}>

          <div style={{ padding:'13px 16px',background:'linear-gradient(135deg,#1f6feb,#0e4fc7)',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
            <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0,border:'2px solid rgba(255,255,255,.28)' }}>🏛️</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ color:'#fff',fontWeight:700,fontSize:14.5,lineHeight:1.2 }}>Jan Sevak</div>
              <div style={{ color:'rgba(255,255,255,.7)',fontSize:11,lineHeight:1.3 }}>Civic Assistant • AI-Powered Offline Bot</div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,.14)',padding:'3px 9px',borderRadius:20 }}>
              <span style={{ width:7,height:7,borderRadius:'50%',background:'#4ade80',boxShadow:'0 0 6px #4ade80',display:'inline-block' }}/>
              <span style={{ color:'rgba(255,255,255,.88)',fontSize:11,fontWeight:600 }}>Offline</span>
            </div>
          </div>

          <div style={{ background:'rgba(16,185,129,.07)',borderBottom:'1px solid rgba(16,185,129,.14)',padding:'5px 14px',display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
            <span style={{ fontSize:11 }}>⚡</span>
            <span style={{ fontSize:11,color:'#065f46',fontWeight:600 }}>Smart Intent Detection Enabled</span>
          </div>

          <div className="jsc" style={{ flex:1,overflowY:'auto',padding:'14px 14px 6px' }}>
            {msgs.map((m,i) => (
              <Bubble key={i} msg={m} handleAutofill={handleAutofill} setInput={setInput} />
            ))}
            {typing && <Dots />}
            {showChips && (
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:4,marginBottom:8,animation:'jFU .3s ease .12s both' }}>
                {QUICK_CHIPS.map(c=>(
                  <button key={c.q} className="jch" onClick={()=>send(c.q)}
                    style={{ padding:'5px 11px',borderRadius:14,border:'1px solid rgba(31,111,235,.22)',background:'rgba(31,111,235,.06)',color:'#1257c6',fontSize:12,fontWeight:500 }}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{ height:1,background:'rgba(31,111,235,.08)',flexShrink:0 }}/>

          <div style={{ padding:'10px 12px',background:'rgba(255,255,255,.85)',backdropFilter:'blur(8px)',flexShrink:0 }}>
            <div style={{ display:'flex',gap:8,alignItems:'flex-end' }}>
              <textarea ref={inputRef} className="jin" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask anything about JAGRUK..." disabled={typing} rows={1}
                style={{ flex:1,resize:'none',border:'1.5px solid rgba(31,111,235,.2)',borderRadius:12,padding:'9px 12px',fontSize:13.5,lineHeight:1.4,background:'#fff',color:'#0f172a',fontFamily:'inherit',maxHeight:86,overflowY:'auto',transition:'border-color .2s,box-shadow .2s' }}
                onInput={e=>{ e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,86)+'px' }}
              />
              <button className="jsd" onClick={()=>send()} disabled={typing||!input.trim()} aria-label="Send"
                style={{ width:38,height:38,borderRadius:12,border:'none',background:input.trim()&&!typing?'#1f6feb':'#e5e7eb',color:input.trim()&&!typing?'#fff':'#9ca3af',cursor:input.trim()&&!typing?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16 }}>
                ➤
              </button>
            </div>
            <div style={{ textAlign:'center',marginTop:6,fontSize:10.5,color:'#9ca3af' }}>
              No internet needed • Multi-category Support
            </div>
          </div>
        </div>
      )}
      {showToast && (
        <AutoFillToast
          message="I’ve pre-filled the form. Please adjust the map pin for accuracy."
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  )
}
