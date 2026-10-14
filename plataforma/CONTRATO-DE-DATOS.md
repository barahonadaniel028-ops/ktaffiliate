# Contrato de datos · Aura

Todo lo que la interfaz lee y escribe. Es el mismo que usa hoy el Portal de Aprobación (se conserva para convivir). Base: `window.claude.use("db")` con `collection(name).doc(id).update/set`, `collection(name).add`, `onSnapshot`, `doc("a/b").set`. Los campos marcados *(nuevo)* son lo único que Aura agrega; todo lo demás ya existe.

## Colecciones

| Colección | Documento | Campos principales |
|---|---|---|
| `brands` | id de cuenta | `name, handle, blogId, color, order, lang, network` |
| `videos` | id | `brand, piece, pieceName, version, hook, caps[], src, poster/posterData, status (pending·maybe·approved·rejected), decidedAt, inMetricool, published, scheduled{at}, review, round, fx, tags[], feedback, feedbackDirty, feedbackSent, wordStyles{}, wordStylesDirty, wordStylesSent, replaces` |
| `notes` | id | `video, round, t (segundo), text, tag, status (open·fixed·resolved), sent, sentAt, by, created` |
| `requests` | `new_<ts>` / `schedule_<brand>` / otros | **Nuevo video:** `kind:"new_video", brand, blogId, at, by, status (pedido·produccion·revisar·listo·bloqueado·cancelado), topic, hooks[], count, format, teacher, intro, versions, music, style, notes, assets[] *(nuevo: assetId de lo subido)*, due *(nuevo)*, steps[]` · **Estudio:** `videoId, kind (abrir·cambio·version·export…), text, status (pedido·trabajando·listo·error·cancelado), steps[{label,status}], at, result` |
| `versions` | id del video | `spec` (especificación del Estudio), `rev, log[]` |
| `transcripts` | id de la pieza | `lines[{s,e,text}]` |
| `feedback` | id | `videoId, clipId, verdict, note` (revisión de medios del Estudio) |
| `metrics` | `blogId` | `updated, rows[]` (reels con `IGRE*`) |
| `evolution` | `blogId` | `updated, metrics[], rows[]` (seguidores/vistas por día) |
| `schedule` | id de cuenta | `slots{ "YYYY-MM-DD": [...] }` |
| `refs` | id | `kind (link·file), url, assetId, name, note, status (nueva·enviada·analizada·lista), sent, sentAt, by, created` |
| `exp_styles` | id | `name, description, status (prueba·aprobado·descartado), decidedAt, params, kind *(nuevo: estilo·transicion·texto·fondo·subtitulos·sonido)*` |
| `exp_rounds` | id | `status, created, overall, overallDirty, sentOverall` |
| `exp_cards` | id | `round, order, style, verdict (keep·maybe·drop), note, dirty, sentVerdict, sentNote` |
| `home` | `todo`, `done`, `trophies` | `todo.items[{id,urgency,title,detail}]`, `done{}`, `trophies{seen{}}` |
| `system` | `status` | `teachersFree, brands{<id>:{introsFree,introsNote}}, rules[], skills[], updated` |
| `rounds` | id de cuenta | `{submitted…}` |
| `submissions` | `<ts>` | `brand, at, by, counts, overall` |

## Eventos que la interfaz espera de Claude (lado producción)

1. **Aprobar = agendar:** al aprobar, la UI hace `videos/<id>.update({status:"approved", decidedAt})` y `requests/schedule_<brand>.set({kind:"schedule", brand, blogId, at, videos:[ids]})`; luego `comments.sendToClaude(...)`. Claude agenda en Metricool y marca `inMetricool:true`.
2. **Rechazar un agendado:** `status:"rejected"` con `inMetricool:true` ⇒ "por quitar de Metricool".
3. **Pedido nuevo:** documento `requests/new_<ts>` + aviso. Claude cambia `status` y `steps`.
4. **Enviar cambios:** marca `sent:true / feedbackDirty:false / dirty:false` y avisa una sola vez.
5. **Estudio:** `requests/<id>` con `videoId` y `kind`; Claude responde con `status`, `steps`, `result` y puede actualizar `versions/<id>`.
6. **Métricas:** la UI lee de Metricool por `mcp.callTool("metricool","getAnalyticsDataByMetrics",…)` y guarda copia en `metrics/<blogId>` y `evolution/<blogId>`.

## Capacidades del artefacto
`db` · `assets` (subir/leer archivos, `assets.put(file)` → id, `/_blob/<id>`) · `comments` (`canSendToClaude`, `sendToClaude`) · `mcp` (metricool) · `sample` (Jarvis) · `user` (`id()`) · `downloads` (SRT/JSON).

## Preset de espacio (`App.config`, no está en la base)
```js
{ id, name, tagline, locale, voice: "vos"|"tu", brands:[{id,name,handle,blogId,color,lang}],
  formats:[[id,label]], intros:[[id,label]], tags:[], rawMaterial:{…}, goals:{ followers, views… },
  jarvis:{ persona, chips:[] }, features:{ studio:true, lab:true, library:true } }
```
