import { useState } from 'react';
import {
  HelpCircle, ChevronDown, ChevronRight, Globe, Rocket, MessageCircle,
  Users, FileText, Send, Palette, LayoutDashboard, Calendar, Wrench,
  Terminal, Clock, Reply, CheckCircle, Settings, BarChart3, FolderOpen,
  Zap, AlertTriangle, RefreshCw, Image, Upload,
} from 'lucide-react';

const content = {
  he: {
    title: 'מדריך שימוש',
    subtitle: 'כל מה שצריך לדעת על בוט הברכות לווטסאפ',
    toggleLabel: 'English',
    sections: [
      {
        id: 'how-to-start',
        icon: Rocket,
        title: 'איך מתחילים',
        content: (
          <div className="space-y-3" dir="rtl">
            <p>הפעלת הבוט:</p>
            <code className="block bg-gray-900 text-green-400 p-3 rounded-lg text-sm font-mono overflow-x-auto" dir="ltr">
              "/Volumes/Extreme SSD/whatsapp-holiday-bot/V4/start.sh"
            </code>
            <p>פתחו בדפדפן: <strong className="text-whatsapp">http://localhost:3000</strong></p>
            <p>שם משתמש: <strong>admin</strong> / סיסמה: <strong>admin123</strong></p>
          </div>
        ),
      },
      {
        id: 'connect-whatsapp',
        icon: MessageCircle,
        title: 'חיבור ווטסאפ',
        content: (
          <div className="space-y-3" dir="rtl">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>עברו לעמוד <strong>WhatsApp</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>לחצו על <strong>Connect / Get QR</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>סרקו את ה-QR עם הטלפון (ווטסאפ &rarr; הגדרות &rarr; מכשירים מקושרים)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">4</span>
                <span>חכו לסטטוס <strong className="text-green-600">"Connected"</strong></span>
              </li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>טיפ:</strong> לאחר החיבור הראשון, הבוט מתחבר מחדש אוטומטית בכל הפעלה.
            </div>
          </div>
        ),
      },
      {
        id: 'sync-contacts',
        icon: Users,
        title: 'סנכרון אנשי קשר וקבוצות',
        content: (
          <div className="space-y-3" dir="rtl">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>עברו לעמוד <strong>WhatsApp</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>לחצו על <strong>Sync All</strong> — ייבוא אנשי קשר וקבוצות מווטסאפ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>בדקו בעמוד <strong>Contacts</strong> שכל אנשי הקשר מופיעים</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">4</span>
                <span>בדקו בעמוד <strong>Groups</strong> שכל הקבוצות מופיעות</span>
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: 'create-templates',
        icon: Palette,
        title: 'יצירת תבניות',
        content: (
          <div className="space-y-4" dir="rtl">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Image size={16} className="text-purple-500" />
                אפשרות א': מ-Canva (מומלץ)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> עצבו כרטיס ברכה ב-Canva עם <code className="bg-gray-100 px-1 rounded">{'{NAME}'}</code> במקום שם הנמען</li>
                <li><span className="font-semibold text-whatsapp">2.</span> עברו ל-Templates &rarr; Browse Canva</li>
                <li><span className="font-semibold text-whatsapp">3.</span> מצאו את העיצוב ולחצו <strong>Use as Template</strong></li>
                <li><span className="font-semibold text-whatsapp">4.</span> בחרו סוג אירוע (שבת, פסח וכו')</li>
                <li><span className="font-semibold text-whatsapp">5.</span> שמרו</li>
              </ol>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Upload size={16} className="text-blue-500" />
                אפשרות ב': העלאת תמונה
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> עצבו כרטיס ברכה בכל כלי (בלי שם)</li>
                <li><span className="font-semibold text-whatsapp">2.</span> עברו ל-Templates &rarr; Add Template</li>
                <li><span className="font-semibold text-whatsapp">3.</span> העלו את התמונה</li>
                <li><span className="font-semibold text-whatsapp">4.</span> הגדירו גופן, גודל, צבע ומיקום X/Y לשם</li>
                <li><span className="font-semibold text-whatsapp">5.</span> שמרו — הבוט יוסיף את השם אוטומטית</li>
              </ol>
            </div>
          </div>
        ),
      },
      {
        id: 'send-greetings',
        icon: Send,
        title: 'שליחת ברכות',
        content: (
          <div className="space-y-5" dir="rtl">
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-500" />
                שליחה ידנית (Send Now)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> עברו ל-<strong>Send Now</strong></li>
                <li><span className="font-semibold text-whatsapp">2.</span> בחרו נמענים — אנשי קשר או קבוצות שלמות</li>
                <li><span className="font-semibold text-whatsapp">3.</span> כתבו הודעה או בחרו תבנית</li>
                <li><span className="font-semibold text-whatsapp">4.</span> לחצו <strong>Send</strong></li>
                <li><span className="font-semibold text-whatsapp">5.</span> עקבו אחרי ההתקדמות</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Clock size={16} className="text-blue-500" />
                שליחה מתוזמנת (Schedules)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> עברו ל-<strong>Schedules</strong></li>
                <li><span className="font-semibold text-whatsapp">2.</span> לחצו <strong>Add Schedule</strong></li>
                <li><span className="font-semibold text-whatsapp">3.</span> בחרו: סוג אירוע, שעת שליחה, קבוצות יעד, ותבנית</li>
                <li><span className="font-semibold text-whatsapp">4.</span> הפעילו ושמרו</li>
                <li><span className="font-semibold text-whatsapp">5.</span> הבוט ישלח אוטומטית בערב שבת/חג!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Reply size={16} className="text-green-500" />
                מענה אוטומטי (Auto-Reply)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> כשמישהו שולח הודעה בשבת/חג, הבוט מכין ברכה אישית</li>
                <li><span className="font-semibold text-whatsapp">2.</span> שולח לאדמין (אתם) לאישור דרך ווטסאפ</li>
                <li><span className="font-semibold text-whatsapp">3.</span> השיבו &#10003; לאישור או &#10007; לדחייה</li>
                <li><span className="font-semibold text-whatsapp">4.</span> הבוט שולח את הברכה</li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">הגדרה ב-<strong>Settings &rarr; Auto-Reply</strong></p>
            </div>
          </div>
        ),
      },
      {
        id: 'canva-integration',
        icon: Palette,
        title: 'חיבור קנבה',
        content: (
          <div className="space-y-3" dir="rtl">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>עברו ל-<strong>Settings</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>לחצו <strong>Connect Canva</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>אשרו ב-Canva</span>
              </li>
            </ol>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              עכשיו תוכלו לגלוש ולהשתמש בעיצובי Canva ישירות כתבניות!
            </div>
          </div>
        ),
      },
      {
        id: 'pages-overview',
        icon: LayoutDashboard,
        title: 'סקירת עמודים',
        content: (
          <div className="overflow-x-auto" dir="rtl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">עמוד</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">תיאור</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Dashboard</td><td className="py-2 px-3 text-gray-600">סקירה כללית: סטטיסטיקות, סטטוס ווטסאפ, אירוע הבא</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">WhatsApp</td><td className="py-2 px-3 text-gray-600">חיבור, QR, סנכרון אנשי קשר/קבוצות/צ'אטים</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Contacts</td><td className="py-2 px-3 text-gray-600">ניהול אנשי קשר, חיפוש, עריכת שמות, ייבוא CSV</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Groups</td><td className="py-2 px-3 text-gray-600">ניהול קבוצות, צפייה בחברים</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Templates</td><td className="py-2 px-3 text-gray-600">יצירה/ניהול תבניות ברכה, אינטגרציית Canva</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Schedules</td><td className="py-2 px-3 text-gray-600">הגדרת שליחה אוטומטית לשבתות/חגים</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Approvals</td><td className="py-2 px-3 text-gray-600">בדיקה ואישור/דחיית הודעות מענה אוטומטי</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Send Now</td><td className="py-2 px-3 text-gray-600">שליחת ברכות ידנית לנמענים נבחרים</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Reports</td><td className="py-2 px-3 text-gray-600">לוגים, סטטיסטיקות משלוח, גרפים</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Settings</td><td className="py-2 px-3 text-gray-600">ווטסאפ, מענה אוטומטי, Canva, טלגרם, גיבוי</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'hebrew-calendar',
        icon: Calendar,
        title: 'לוח שנה עברי',
        content: (
          <div className="overflow-x-auto" dir="rtl">
            <p className="text-sm text-gray-600 mb-3">הבוט מזהה אוטומטית את האירועים הבאים:</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">אירוע</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">זמן ברירת מחדל</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">ברכה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">שבת</td><td className="py-2 px-3">יום שישי 10:00</td><td className="py-2 px-3">שבת שלום</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">ראש השנה</td><td className="py-2 px-3">ערב 09:00</td><td className="py-2 px-3">שנה טובה</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">יום כיפור</td><td className="py-2 px-3">ערב 08:00</td><td className="py-2 px-3">גמר חתימה טובה</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">סוכות</td><td className="py-2 px-3">ערב 10:00</td><td className="py-2 px-3">חג שמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">שמחת תורה</td><td className="py-2 px-3">ערב 10:00</td><td className="py-2 px-3">חג שמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">חנוכה</td><td className="py-2 px-3">יום 1 10:00</td><td className="py-2 px-3">חנוכה שמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">פורים</td><td className="py-2 px-3">יום 08:00</td><td className="py-2 px-3">פורים שמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">פסח</td><td className="py-2 px-3">ערב 09:00</td><td className="py-2 px-3">פסח כשר ושמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">יום העצמאות</td><td className="py-2 px-3">ערב 10:00</td><td className="py-2 px-3">חג שמח</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">שבועות</td><td className="py-2 px-3">ערב 10:00</td><td className="py-2 px-3">חג שמח</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'troubleshooting',
        icon: Wrench,
        title: 'פתרון בעיות',
        content: (
          <div className="overflow-x-auto" dir="rtl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">בעיה</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">פתרון</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">ווטסאפ תקוע על "Connecting"</td><td className="py-2 px-3">הפעילו מחדש את הבוט, חכו 30 שניות ל-QR</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">QR לא מופיע</td><td className="py-2 px-3">סגרו תהליכי Chrome: <code className="bg-gray-100 px-1 rounded text-xs" dir="ltr">pkill -f "Google Chrome for Testing"</code></td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">שגיאת "Rate limited"</td><td className="py-2 px-3">חכו 15 דקות, או הפעילו מחדש</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Canva "Unauthorized"</td><td className="py-2 px-3">Settings &rarr; Reconnect Canva</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">תצוגה מקדימה לא נטענת</td><td className="py-2 px-3">ודאו שלתבנית יש תמונה מועלית</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">הבוט לא עולה</td><td className="py-2 px-3">בדקו MySQL: <code className="bg-gray-100 px-1 rounded text-xs" dir="ltr">docker start whatsapp-bot-mysql</code></td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
  },
  en: {
    title: 'User Guide',
    subtitle: 'Everything you need to know about the WhatsApp Holiday Greeting Bot',
    toggleLabel: 'עברית',
    sections: [
      {
        id: 'how-to-start',
        icon: Rocket,
        title: 'How to Start',
        content: (
          <div className="space-y-3">
            <p>Start the bot:</p>
            <code className="block bg-gray-900 text-green-400 p-3 rounded-lg text-sm font-mono overflow-x-auto">
              "/Volumes/Extreme SSD/whatsapp-holiday-bot/V4/start.sh"
            </code>
            <p>Open browser: <strong className="text-whatsapp">http://localhost:3000</strong></p>
            <p>Login: <strong>admin</strong> / <strong>admin123</strong></p>
          </div>
        ),
      },
      {
        id: 'connect-whatsapp',
        icon: MessageCircle,
        title: 'Connect WhatsApp',
        content: (
          <div className="space-y-3">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>Go to <strong>WhatsApp</strong> page</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>Click <strong>Connect / Get QR</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>Scan QR with your phone (WhatsApp &rarr; Settings &rarr; Linked Devices)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">4</span>
                <span>Wait for <strong className="text-green-600">"Connected"</strong> status</span>
              </li>
            </ol>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Tip:</strong> After first connection, the bot reconnects automatically on restart.
            </div>
          </div>
        ),
      },
      {
        id: 'sync-contacts',
        icon: Users,
        title: 'Sync Contacts & Groups',
        content: (
          <div className="space-y-3">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>Go to <strong>WhatsApp</strong> page</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>Click <strong>Sync All</strong> — imports contacts and groups from WhatsApp</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>Check <strong>Contacts</strong> page — you should see all your contacts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">4</span>
                <span>Check <strong>Groups</strong> page — you should see all your WhatsApp groups</span>
              </li>
            </ol>
          </div>
        ),
      },
      {
        id: 'create-templates',
        icon: Palette,
        title: 'Create Templates',
        content: (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Image size={16} className="text-purple-500" />
                Option A: From Canva (recommended)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> Design a greeting card in Canva with <code className="bg-gray-100 px-1 rounded">{'{NAME}'}</code> where you want the recipient's name</li>
                <li><span className="font-semibold text-whatsapp">2.</span> Go to Templates &rarr; Browse Canva</li>
                <li><span className="font-semibold text-whatsapp">3.</span> Find your design &rarr; click <strong>Use as Template</strong></li>
                <li><span className="font-semibold text-whatsapp">4.</span> Choose event type (shabbat, pesach, etc.)</li>
                <li><span className="font-semibold text-whatsapp">5.</span> Save</li>
              </ol>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Upload size={16} className="text-blue-500" />
                Option B: Upload Image
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> Design a greeting card in any tool (without name)</li>
                <li><span className="font-semibold text-whatsapp">2.</span> Go to Templates &rarr; Add Template</li>
                <li><span className="font-semibold text-whatsapp">3.</span> Upload the image</li>
                <li><span className="font-semibold text-whatsapp">4.</span> Set font, size, color, and X/Y position for where the name should appear</li>
                <li><span className="font-semibold text-whatsapp">5.</span> Save — the bot will overlay the name using Sharp</li>
              </ol>
            </div>
          </div>
        ),
      },
      {
        id: 'send-greetings',
        icon: Send,
        title: 'Send Greetings',
        content: (
          <div className="space-y-5">
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-500" />
                Manual Send (Send Now)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> Go to <strong>Send Now</strong></li>
                <li><span className="font-semibold text-whatsapp">2.</span> Select recipients — individual contacts or entire groups</li>
                <li><span className="font-semibold text-whatsapp">3.</span> Type a message or select a template</li>
                <li><span className="font-semibold text-whatsapp">4.</span> Click <strong>Send</strong></li>
                <li><span className="font-semibold text-whatsapp">5.</span> Watch the progress bar</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Clock size={16} className="text-blue-500" />
                Scheduled Send (Automatic)
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> Go to <strong>Schedules</strong></li>
                <li><span className="font-semibold text-whatsapp">2.</span> Click <strong>Add Schedule</strong></li>
                <li><span className="font-semibold text-whatsapp">3.</span> Choose: event type, send time, target groups, and template</li>
                <li><span className="font-semibold text-whatsapp">4.</span> Enable and save</li>
                <li><span className="font-semibold text-whatsapp">5.</span> The bot sends automatically on erev shabbat/chag!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Reply size={16} className="text-green-500" />
                Auto-Reply
              </h4>
              <ol className="space-y-2 text-sm">
                <li><span className="font-semibold text-whatsapp">1.</span> When someone messages you during shabbat/holiday, the bot prepares a personalized greeting</li>
                <li><span className="font-semibold text-whatsapp">2.</span> Sends to admin (you) for approval via WhatsApp</li>
                <li><span className="font-semibold text-whatsapp">3.</span> Reply with checkmark to approve or X to reject</li>
                <li><span className="font-semibold text-whatsapp">4.</span> Bot sends the greeting</li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">Configure in <strong>Settings &rarr; Auto-Reply</strong></p>
            </div>
          </div>
        ),
      },
      {
        id: 'canva-integration',
        icon: Palette,
        title: 'Canva Integration',
        content: (
          <div className="space-y-3">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">1</span>
                <span>Go to <strong>Settings</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">2</span>
                <span>Click <strong>Connect Canva</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-whatsapp/10 text-whatsapp text-sm font-bold shrink-0">3</span>
                <span>Authorize in Canva</span>
              </li>
            </ol>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Now you can browse and use Canva designs directly as templates!
            </div>
          </div>
        ),
      },
      {
        id: 'pages-overview',
        icon: LayoutDashboard,
        title: 'Pages Overview',
        content: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Page</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Dashboard</td><td className="py-2 px-3 text-gray-600">Overview: stats, WhatsApp status, next event</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">WhatsApp</td><td className="py-2 px-3 text-gray-600">Connection, QR, sync contacts/groups/chats</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Contacts</td><td className="py-2 px-3 text-gray-600">Manage contacts, search, edit names, import CSV</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Groups</td><td className="py-2 px-3 text-gray-600">Manage groups, view members</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Templates</td><td className="py-2 px-3 text-gray-600">Create/manage greeting templates, Canva integration</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Schedules</td><td className="py-2 px-3 text-gray-600">Set up automatic sending for shabbat/holidays</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Approvals</td><td className="py-2 px-3 text-gray-600">Review and approve/reject auto-reply messages</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Send Now</td><td className="py-2 px-3 text-gray-600">Send greetings manually to selected recipients</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Reports</td><td className="py-2 px-3 text-gray-600">Message logs, delivery stats, charts</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3 font-medium">Settings</td><td className="py-2 px-3 text-gray-600">WhatsApp, Auto-Reply, Canva, Telegram, Backup</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'hebrew-calendar',
        icon: Calendar,
        title: 'Hebrew Calendar Events',
        content: (
          <div className="overflow-x-auto">
            <p className="text-sm text-gray-600 mb-3">The bot automatically detects these events:</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Event</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Default Time</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Greeting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Shabbat</td><td className="py-2 px-3">Friday 10:00</td><td className="py-2 px-3">Shabbat Shalom</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Rosh Hashana</td><td className="py-2 px-3">Erev 09:00</td><td className="py-2 px-3">Shana Tova</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Yom Kippur</td><td className="py-2 px-3">Erev 08:00</td><td className="py-2 px-3">G'mar Chatima Tova</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Sukkot</td><td className="py-2 px-3">Erev 10:00</td><td className="py-2 px-3">Chag Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Simchat Torah</td><td className="py-2 px-3">Erev 10:00</td><td className="py-2 px-3">Chag Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Chanukah</td><td className="py-2 px-3">Day 1 10:00</td><td className="py-2 px-3">Chanukah Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Purim</td><td className="py-2 px-3">Day 08:00</td><td className="py-2 px-3">Purim Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Pesach</td><td className="py-2 px-3">Erev 09:00</td><td className="py-2 px-3">Pesach Kasher v'Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Yom HaAtzmaut</td><td className="py-2 px-3">Erev 10:00</td><td className="py-2 px-3">Chag Sameach</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Shavuot</td><td className="py-2 px-3">Erev 10:00</td><td className="py-2 px-3">Chag Sameach</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: 'troubleshooting',
        icon: Wrench,
        title: 'Troubleshooting',
        content: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Problem</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">WhatsApp stuck on "Connecting"</td><td className="py-2 px-3">Restart bot, wait 30s for QR</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">QR code not appearing</td><td className="py-2 px-3">Kill Chrome processes: <code className="bg-gray-100 px-1 rounded text-xs">pkill -f "Google Chrome for Testing"</code></td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">"Rate limited" errors</td><td className="py-2 px-3">Wait 15 minutes, or restart bot</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Canva "Unauthorized"</td><td className="py-2 px-3">Settings &rarr; Reconnect Canva</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Template preview not loading</td><td className="py-2 px-3">Make sure template has an uploaded image</td></tr>
                <tr className="hover:bg-gray-50"><td className="py-2 px-3">Bot won't start</td><td className="py-2 px-3">Check MySQL: <code className="bg-gray-100 px-1 rounded text-xs">docker start whatsapp-bot-mysql</code></td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
  },
};

function AccordionSection({ section, isOpen, onToggle }) {
  const Icon = section.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-whatsapp/10 shrink-0">
          <Icon size={18} className="text-whatsapp" />
        </div>
        <span className="flex-1 font-semibold text-gray-800">{section.title}</span>
        {isOpen ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronRight size={18} className="text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-gray-100 pt-4">
            {section.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const [lang, setLang] = useState('he');
  const [openSections, setOpenSections] = useState({ 'how-to-start': true });

  const t = content[lang];
  const isRtl = lang === 'he';

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    t.sections.forEach((s) => { all[s.id] = true; });
    setOpenSections(all);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-whatsapp/10">
            <HelpCircle size={22} className="text-whatsapp" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <Globe size={16} />
          {t.toggleLabel}
        </button>
      </div>

      {/* Expand/Collapse controls */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={expandAll}
          className="text-xs text-whatsapp hover:underline font-medium"
        >
          {lang === 'he' ? 'פתח הכל' : 'Expand All'}
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-gray-500 hover:underline font-medium"
        >
          {lang === 'he' ? 'סגור הכל' : 'Collapse All'}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {t.sections.map((section) => (
          <AccordionSection
            key={section.id}
            section={section}
            isOpen={!!openSections[section.id]}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
