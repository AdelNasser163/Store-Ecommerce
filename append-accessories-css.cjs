const fs=require('fs');
function scopeBlock(text,inKeyframes=false){let out='',i=0;while(i<text.length){while(i<text.length&&/\s/.test(text[i]))out+=text[i++];if(i>=text.length)break;const brace=text.indexOf('{',i);if(brace<0){out+=text.slice(i);break}const header=text.slice(i,brace).trim();let depth=1,j=brace+1;while(j<text.length&&depth){if(text[j]==='{')depth++;else if(text[j]==='}')depth--;j++}const body=text.slice(brace+1,j-1);if(header.startsWith('@media')||header.startsWith('@supports'))out+=header+'{'+scopeBlock(body,inKeyframes)+'}';else if(header.startsWith('@keyframes'))out+=header+'{'+scopeBlock(body,true)+'}';else if(header.startsWith('@')||inKeyframes||/^(from|to|\d+%)$/.test(header))out+=header+'{'+body+'}';else out+=header.split(',').map(s=>`body[data-page="accessories"] ${s.trim()}`).join(',')+'{'+body+'}';i=j}return out}
const generated=scopeBlock(fs.readFileSync('accessories.generated.css','utf8'));
const custom=`
/* Accessories page: scoped Stitch utilities and AlMumez shared theme */
${generated}
body[data-page="accessories"]{background:#f8fafc;color:#0b192e}
body[data-page="accessories"].theme-home .bg-background{background-color:#f8fafc}
body[data-page="accessories"].theme-home .bg-surface-container-low{background-color:#f1f5f9}
body[data-page="accessories"].theme-home .bg-surface-container{background-color:#e2e8f0}
body[data-page="accessories"].theme-home .bg-surface-container-high{background-color:#e2e8f0}
body[data-page="accessories"].theme-home .bg-surface-container-lowest{background-color:#fff}
body[data-page="accessories"].theme-home .bg-inverse-surface{background-color:#0b192e}
body[data-page="accessories"].theme-home .text-on-surface{color:#0b192e}
body[data-page="accessories"].theme-home .text-on-surface-variant{color:#475569}
body[data-page="accessories"].theme-home .text-outline{color:#64748b}
body[data-page="accessories"].theme-home .text-primary{color:#3e6a00}
body[data-page="accessories"].theme-home .border-outline-variant\/50,body[data-page="accessories"].theme-home .border-outline-variant\/60,body[data-page="accessories"].theme-home .border-outline-variant\/70,body[data-page="accessories"].theme-home .border-outline-variant\/80{border-color:rgba(203,213,225,.75)}
body[data-page="accessories"] input[type=range]::-webkit-slider-thumb{height:18px;width:18px;border-radius:50%;background:#8bc34a;cursor:pointer;-webkit-appearance:none;margin-top:-6px;box-shadow:0 1px 4px rgba(62,106,0,.4);border:2px solid #fff}
body[data-page="accessories"] input[type=range]::-webkit-slider-runnable-track{width:100%;height:6px;cursor:pointer;background:#e2e8f0;border-radius:9999px}
body[data-page="accessories"] [data-component="site-header"] .rounded-xl,body[data-page="accessories"] [data-component="site-footer"] .rounded-xl{border-radius:1.75rem}
body[data-page="accessories"] [data-component="site-header"] .rounded,body[data-page="accessories"] [data-component="site-footer"] .rounded{border-radius:.75rem}
@media(max-width:1023px){body[data-page="accessories"] main>div.grid{grid-template-columns:1fr}body[data-page="accessories"] main>div.grid>aside{display:none}}
`;
fs.appendFileSync('style.css',custom);
