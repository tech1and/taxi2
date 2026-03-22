// components/Analytics.js
import Script from 'next/script';

export default function Analytics() {
  const yandexId = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID?.trim();
  const gaId     = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const bingUetId = process.env.NEXT_PUBLIC_BING_UET_ID?.trim();
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();

  return (
    <>
      {/* ===== Яндекс Метрика ===== */}
      {yandexId && (
        <>
          <Script
            id="yandex-metrika-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(m,e,t,r,i,k,a){
                  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                  m[i].l=1*new Date();
                  for(var j=0;j<document.scripts.length;j++){
                    if(document.scripts[j].src===r){return;}
                  }
                  k=e.createElement(t),a=e.getElementsByTagName(t)[0],
                  k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
                })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
                ym(${yandexId},'init',{
                  webvisor:true,
                  clickmap:true,
                  ecommerce:"dataLayer",
                  accurateTrackBounce:true,
                  trackLinks:true
                });
              `,
            }}
          />
          {/* noscript ВНУТРИ условия */}
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${yandexId}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}

      {/* ===== Google Analytics ===== */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-analytics-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer=window.dataLayer||[];
                function gtag(){dataLayer.push(arguments);}
                gtag('js',new Date());
                gtag('config','${gaId}',{page_path:window.location.pathname});
              `,
            }}
          />
        </>
      )}

      {/* ===== Bing UET ===== */}
      {bingUetId && (
        <>
          <Script
            id="bing-uet-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,t,r,u){
                  var f,n,i;w[u]=w[u]||[];
                  f=function(){
                    var o={ti:"${bingUetId}"};
                    o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")
                  };
                  n=d.createElement(t),n.src=r,n.async=1,
                  n.onload=n.onreadystatechange=function(){
                    var s=this.readyState;
                    if(s&&s!=="loaded"&&s!=="complete")return;
                    f(),n.onload=n.onreadystatechange=null
                  };
                  i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)
                })(window,document,'script','//bat.bing.com/bat.js','uetq');
              `,
            }}
          />
          {/* noscript ВНУТРИ условия */}
          <noscript>
            <img
              src={`//bat.bing.com/action/0?ti=${bingUetId}&Ver=2`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ===== Microsoft Clarity ===== */}
      {clarityId && (
        <Script
          id="clarity-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;
                t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,'clarity','script','${clarityId}');
            `,
          }}
        />
      )}
    </>
  );
}