import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. جلب الكوكيز (تأكد من كتابة الاسم بالضبط كما يتم حفظه في صفحة الـ Welcome)
  const hasSeenWelcome = request.cookies.get('hasSeenWelcome');
  const { pathname } = request.nextUrl;

  // 2. قائمة المستثنيات (الملفات العامة، الصور، API، وصفحة الترحيب نفسها)
  // أضفنا فحصاً للتأكد من عدم حظر ملفات النظام الأساسية
  const isPublicFile = pathname.startsWith('/_next') || 
                       pathname.startsWith('/api') || 
                       pathname.startsWith('/static') ||
                       pathname.includes('.') || // لملفات الصور والأيقونات
                       pathname === '/welcome';

  if (isPublicFile) {
    return NextResponse.next();
  }

  // 3. المنطق الأساسي: إذا لم يمتلك الكوكيز، وجهه فوراً لصفحة الترحيب
  if (!hasSeenWelcome) {
    // نقوم بإنشاء رابط التوجيه
    const url = request.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  // 4. إذا كان لديه الكوكيز، اسمح له بالمرور
  return NextResponse.next();
}

// 5. تعديل الـ Matcher ليكون شاملاً لكل شيء ما عدا المستثنيات التقنية
export const config = {
  matcher: [
    /*
     * يشمل كل المسارات ما عدا:
     * 1. api (مسارات الـ API)
     * 2. _next/static (الملفات الساكنة)
     * 3. _next/image (تحسين الصور)
     * 4. favicon.ico (أيقونة الموقع)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
