# Notas pendientes — App PTAR

---

## 🔐 Acceso usuario Luna Sofía Osorio Parra

**Correo:** `lunaop@permoda.com.co`  
**Estado:** usuario NO existe en la base de datos → no puede iniciar sesión.

### Qué hay que hacer

Ejecutar el siguiente SQL **una sola vez** en MySQL Workbench (base `ptar_permoda`):

```sql
INSERT INTO ptar_permoda.ptar_users (email, nombre, role, password_hash)
VALUES (
  'lunaop@permoda.com.co',
  'Luna Sofía Osorio Parra',
  'operario',
  '$2b$12$yOWAU3SIKAoPGKH4SSWQ/uxFTVyeoI/rl.QDB1iTq4K1Fk18akkZa'
);
```

**Contraseña resultante:** `Permoda2026!`

### Roles que tendrá en la app

El archivo `ptar-app/src/features/auth/AuthContext.tsx` tiene una lista
`USERS_BY_EMAIL` que sobreescribe los roles del backend. Luna debe estar ahí
con todos los roles que necesite. Verificar que exista esta entrada (o agregarla):

```typescript
'lunaop@permoda.com.co': { roles: ['operario', 'encargado', 'calidad', 'admin'] },
```

Si no está en `USERS_BY_EMAIL`, solo tendrá el rol `operario` (el que se
inserta en la DB).

### Verificación post-INSERT

```sql
SELECT id, email, nombre, role FROM ptar_permoda.ptar_users
WHERE email = 'lunaop@permoda.com.co';
```

Debe devolver 1 fila. Luego probar login en la app con `lunaop@permoda.com.co`
/ `Permoda2026!`.

---

*Nota creada: 2026-06-09*
