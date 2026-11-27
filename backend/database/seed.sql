-- =====================================================
-- NexDesk: datos semilla (demo y pruebas)
-- Requiere los 3 usuarios de prueba ya creados:
--   admin@test.com, tecnico@test.com, empleado@test.com
-- Es idempotente: se puede ejecutar varias veces sin duplicar.
-- =====================================================

-- 10 tickets en Demo Corp (distintos estados, prioridades y categorías)
INSERT INTO public.tickets
    (organization_id, reported_by, assigned_to, title, description, category, priority, status)
SELECT o.id, r.id, t.id, v.title, v.description, v.category, v.priority, v.status
FROM (VALUES
    ('Impresora no imprime',            'La impresora del piso 2 no responde',            'hardware', 'medium',   'open',        'empleado@test.com', NULL),
    ('Sin acceso a VPN',                'Error de autenticación al conectar a la VPN',    'red',      'high',     'in_progress', 'empleado@test.com', 'tecnico@test.com'),
    ('Correo lleno',                    'El buzón llegó al límite de almacenamiento',     'software', 'low',      'resolved',    'empleado@test.com', 'tecnico@test.com'),
    ('Pantalla parpadea',               'El monitor parpadea cada pocos minutos',         'hardware', 'medium',   'on_hold',     'empleado@test.com', 'tecnico@test.com'),
    ('Instalar Office',                 'Se requiere Office en la laptop nueva',          'software', 'low',      'closed',      'empleado@test.com', 'tecnico@test.com'),
    ('Wi-Fi caído en sala 2',           'Sin conexión inalámbrica en la sala de juntas',  'red',      'critical', 'in_progress', 'empleado@test.com', 'tecnico@test.com'),
    ('Contraseña bloqueada',            'La cuenta se bloqueó tras varios intentos',      'accesos',  'high',     'open',        'empleado@test.com', NULL),
    ('Teclado fallando',                'Varias teclas no responden',                     'hardware', 'low',      'open',        'tecnico@test.com',  NULL),
    ('Solicitud de monitor adicional',  'Se pide un segundo monitor para el puesto',      'hardware', 'medium',   'open',        'tecnico@test.com',  NULL),
    ('Servidor de archivos lento',      'El acceso a la carpeta compartida tarda mucho',  'red',      'critical', 'open',        'empleado@test.com', NULL)
) AS v(title, description, category, priority, status, reporter, assignee)
CROSS JOIN (SELECT id FROM public.organizations WHERE name = 'Demo Corp') o
JOIN public.users r ON r.email = v.reporter
LEFT JOIN public.users t ON t.email = v.assignee
WHERE NOT EXISTS (
    SELECT 1 FROM public.tickets x WHERE x.organization_id = o.id AND x.title = v.title
);

-- Segunda organización con un ticket, solo para probar el aislamiento entre organizaciones.
-- (reported_by solo cumple la llave foránea; ese usuario no es miembro de esta organización.)
INSERT INTO public.organizations (name)
SELECT 'Otra Corp'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Otra Corp');

INSERT INTO public.tickets (organization_id, reported_by, title, description, category, priority, status)
SELECT o.id, u.id, 'Ticket confidencial de otra organización', 'No debe ser visible desde Demo Corp', 'general', 'high', 'open'
FROM public.organizations o
JOIN public.users u ON u.email = 'admin@test.com'
WHERE o.name = 'Otra Corp'
  AND NOT EXISTS (SELECT 1 FROM public.tickets x WHERE x.organization_id = o.id);
