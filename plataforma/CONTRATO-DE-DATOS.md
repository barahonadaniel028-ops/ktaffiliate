# Contrato de datos · Aura

Todo lo que la interfaz lee y escribe en la base del artefacto. Esta versión se reconstruyó **del código de Aura y de los datos de demostración** (`app/dev/fixtures.js`, escritos para imitar al Portal de Aprobación), no copiando el Portal vivo. **Si algo de aquí difiere del Portal vivo, el Portal vivo manda**: se corrige este documento y el código de Aura, nunca el proceso real de Claude.

Base: `window.claude.use("db")` con `collection(name).doc(id).update/set/delete`, `collection(name).add`, `onSnapshot`. Las 20 colecciones que Aura escucha (`App.COLLECTIONS`, en `app/js/core/state.js`):

`brands · videos · notes · requests · refs · exp_styles · exp_rounds · exp_cards · library · studio_projects · studio_versions · studio_requests · studio_media_feedback · studio_transcripts · metrics · evolution · schedule · rounds · system · home` (más `diag`, una bitácora silenciosa que solo se escribe).

Marcas usadas abajo: **(Aura)** = campo o documento que Aura agrega y que el lado de Claude puede ignorar sin romper nada (todo es aditivo). Lo demás ya existía en el Portal.

## Colecciones y documentos

| Colección | Id | Campos principales |
|---|---|---|
| `brands` | id de cuenta | `name, handle, blogId, color, order, lang, network` (si falta, se usa el preset de `App.config`) |
| `videos` | `<brand>_<pieza>_v<n>` | `brand, piece, pieceName, version, hook, caps[[palabra, cuadroIni, cuadroFin]], capFps, src, poster, tone, status (pending·maybe·approved·rejected), date, scheduled, order, round, duration, tags[], fx, decidedAt, inMetricool, published, review, replaces, feedback, feedbackDirty, feedbackSent, wordStyles{}, wordStylesDirty, wordStylesSent` |
| `notes` | auto o `n<k>` | `video, brand, piece, round, t, tc, text, tags[], status (open·fixed·resolved), sent, sentAt, by, created, scope (video·group·selection·brand·general·style), title, ids[], reply` |
| `requests` | ver abajo | pedidos y avisos que Claude debe leer |
| `refs` | auto | `kind (link·file), url, assetId, name, note, status (nueva·enviada·analizada), sent, sentAt, by, created, analysis{resumen,texto,transiciones,animaciones,ritmo,colores,comoRecrear[]}, styleId` · **(Aura)** `dna{v,kind,duration,cuts[],cpm,motion,lum,contrast,sat,warmth,palette[{hex,w}],axes{ritmo,movimiento,contraste,color,luz,energia},audio,thumbs[]}`, `recipe{v,name,font,size,accent,text,keyAccent,glow,anim,beat,trans,bg,hero,subs,card,palette[],energy}` |
| `exp_styles` | auto o `lab_<id>` | `name, description, status (prueba·aprobado·descartado), decidedAt, kind (estilo·transicion·texto·fondo·subtitulos·sonido), demo, when` · **(Aura)** `recipe{…igual que refs.recipe}, from{ref|seed}, source:"laboratorio", created, demo:"r-<id>"` |
| `exp_rounds` | `rd<k>` | `name, status, created, overall, overallDirty, sentOverall` |
| `exp_cards` | `c<k>` | `round, order, demo, label, desc, styleId, verdict (keep·maybe·drop), note, dirty, sentVerdict, sentNote` |
| `library` | auto | elementos propios de la Biblioteca: `type, name, desc, when, demo` |
| `studio_projects` | id de pieza | proyecto del Estudio por pieza |
| `studio_versions` | id del video | `project, spec{v,fps,w,h,duration,lang,base,tracks[]}, rev, updatedAt, log[{at,text,by}], by` — la especificación del editor; **es la que renderiza HyperFrames** |
| `studio_requests` | auto o `sr<k>` | `videoId, project, brand, kind (abrir·cambio·version·export), text, scope (video·clip·piece), targets[], at_time, status (pedido·trabajando·listo·error), steps[{id,text,status}], reply, at, by, rev, export{format,ext,w,h,audio,quality}, style` · **(Aura)** `model, effort, assets[{id,name,size,type,kind}]` |
| `studio_media_feedback` | auto | veredicto sobre imágenes/medios del Estudio: `videoId, clipId, verdict, note` |
| `studio_transcripts` | id de pieza | `lines[{s,e,es,en}]` |
| `metrics` | `blogId` | `updated, rows[]` (reels, columnas `IGRE*` de Metricool) |
| `evolution` | `blogId` | `updated, metrics[], rows[]` (seguidores, vistas, alcance, interacciones por día) |
| `schedule` | id de cuenta | `slots{ "YYYY-MM-DDTHH:MM": … }` (lo agendado por Claude en Metricool) |
| `rounds` | id de cuenta | estado de ronda de revisión por cuenta (legado, se conserva) |
| `system` | `status` | `teachersFree, teachersNote, brands{<id>:{introsFree,introsNote}}, rules[], skills[], updated` |
| `home` | `todo` · `done` · `trophies` | `todo.items[{id,urgency (now·today·week),title,detail,link,auto}]` · `done{<id>:fecha}` · `trophies{baseline, seen{<id>:fecha}}` **(Aura)** `trophies.level` (último nivel celebrado) |
| `diag` | `<ts>_<k>` | bitácora silenciosa: `step, info, at, ua` |

### `requests` (lo que Claude lee), por tipo de documento

| Id | Quién lo escribe | Contenido |
|---|---|---|
| `schedule_<brand>` | al aprobar/rechazar | `kind:"schedule", brand, blogId, at, by, state (pendiente·vacio), schedule[{piece,name,day,ids[],replace}], remove[{id,piece,version,scheduled}]` — se reescribe completo cada vez; Claude agenda en Metricool y pone `inMetricool:true` en cada video |
| `new_<ts>` | Crear | `kind:"new_video", brand, blogId, at, by, status (pedido·produccion·revisar·listo·bloqueado·cancelado), source (idea·material), topic, hooks[], count, format, teacher, intro, versions, music, style, due, notes, links[], assets[{id,name,size,purpose}], steps[{id,text,status}], reply` · **(Aura)** `model, effort` |
| `changes_<ts>` | Enviar cambios | `kind:"changes_batch", at, by, status:"pendiente", count, notes[ids], videos[{id,brand,feedback,tags}], refs[ids], roundCards[{id,label,verdict,note,styleId}], captionEdits[{brand,piece,ids,wordStyles}]` |
| `jarvis_<ts>` | Jarvis → pasarle algo a Claude | **(Aura)** `kind:"jarvis", text, at, by, status:"pendiente", model, effort, assets[{id,name,size,type,kind}]` |
| `recreate_<ts>` | Laboratorio → "Pedirle a Claude" | **(Aura)** `kind:"recreate_style", recipe{…}, ref (id de refs), note, at, by, status:"pedido", steps[], model, effort, assets[]`. Claude arma el estilo completo y lo deja en `exp_styles` con `status:"prueba"` |

## Lo que la interfaz espera de Claude (lado producción)

1. **Aprobar = agendar.** La UI hace `videos/<id>.update({status:"approved", decidedAt})`, reescribe `requests/schedule_<brand>` y llama `comments.sendToClaude(...)`. Claude agenda en Metricool y marca `inMetricool:true`.
2. **Rechazar un agendado.** `status:"rejected"` con `inMetricool:true` ⇒ "por quitar de Metricool"; Claude lo saca del calendario.
3. **Pedido nuevo.** `requests/new_<ts>` + aviso. Claude cambia `status`, escribe `steps`, deja `reply`.
4. **Enviar cambios.** Un solo `requests/changes_<ts>` y un solo aviso; la UI marca `sent:true / feedbackDirty:false / dirty:false`. Claude responde en cada nota con `status:"fixed"` y `reply`.
5. **Estudio.** `studio_requests/<id>` con `videoId` y `kind`; Claude escribe `steps` (uno por uno: `pendiente → haciendo → hecho|error`), `status:"listo"` y `reply`, y puede actualizar `studio_versions/<id>` (la UI avisa si cambió mientras se editaba: `rev`).
6. **Métricas.** La UI llama `mcp.callTool("metricool","getAnalyticsDataByMetrics",{brandId,from,to,metrics})` y guarda copia en `metrics/<blogId>` y `evolution/<blogId>`.
7. **Modelo e intensidad (Aura).** Cada pedido lleva `model` (`claude-sonnet-5-5` por defecto, o `claude-opus-5-5`, `claude-fable-5-1`, `claude-haiku-5-5`) y `effort` (`low·medium·high`). Para Jarvis dentro de la página se aplica de verdad (opción `model`/`effort` de `sample`). Para producción lo decide la sesión que lee el pedido: **debe respetarlo** al elegir con qué modelo trabaja.
8. **Archivos adjuntos (Aura).** `assets[].id` es el id de la capacidad `assets` (se sirve en `/_blob/<id>`); máximo 19 MB por archivo; tipos: video, imagen, PDF, csv, md, json, txt, srt, vtt.

## Capacidades que declara el artefacto

`db` · `user` (`id()`, `can("data.write")`) · `mcp` (servidor `metricool`, herramienta `getAnalyticsDataByMetrics`) · `comments` (forma completa: `canSendToClaude`, `anchorFor`, `sendToClaude`) · `assets` · `downloads` (SRT/JSON/MP4) · `sample` con `images:true` (Jarvis; imágenes adjuntas) .

## Preset de espacio (`App.config`, no está en la base)

```js
{ id, name, short, owner, voice: "vos"|"tu", brands:[{id,name,handle,blogId,color,lang}],
  formats:[[id,label]], intros:[[id,label]], tags:[], rawLabels:{…}, hasTeacher, runwayTarget, runwayWarn,
  jarvis:{ persona, chips:[] } }
```
Presets incluidos: `kt` (Daniel) y `lumen` (marca ficticia para probar que la interfaz no depende de KT). `?preset=` lo cambia.
