-- Crear tipos ENUM si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'area') THEN
        CREATE TYPE area AS ENUM (
            'patronaje', 'corte', 'bordado', 'ensamble', 
            'plancha', 'calidad', 'operaciones', 'admin', 'envios', 'almacen', 'diseño'
        );
    ELSE
        BEGIN
            ALTER TYPE area ADD VALUE 'envios';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE area ADD VALUE 'almacen';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
        CREATE TYPE transfer_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency') THEN
        CREATE TYPE urgency AS ENUM ('urgente', 'intermedio', 'poco_urgente');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reposition_type') THEN
        CREATE TYPE reposition_type AS ENUM ('repocision', 'reproceso');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reposition_status') THEN
        CREATE TYPE reposition_status AS ENUM ('pendiente', 'aprobado', 'completado', 'cancelado');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_status') THEN
        CREATE TYPE material_status AS ENUM ('disponible', 'falta_parcial', 'no_disponible');
    END IF;
END
$$;

-- Agregar valores adicionales a los ENUMs si no existen
DO $$
BEGIN
    BEGIN
        ALTER TYPE reposition_status ADD VALUE 'eliminado';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE reposition_status ADD VALUE 'rechazado';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE notification_type ADD VALUE 'reposition_deleted';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE notification_type ADD VALUE 'new_reposition';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END
$$;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    area area NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON users(id);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    cliente_hotel TEXT NOT NULL,
    no_solicitud TEXT NOT NULL,
    no_hoja TEXT,
    modelo TEXT NOT NULL,
    tipo_prenda TEXT NOT NULL,
    color TEXT NOT NULL,
    tela TEXT NOT NULL,
    total_piezas INTEGER NOT NULL,
    current_area area NOT NULL DEFAULT 'corte',
    status order_status NOT NULL DEFAULT 'active',
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    completed_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_folio_unique ON orders(folio);
CREATE UNIQUE INDEX IF NOT EXISTS orders_pkey ON orders(id);

-- Historial de órdenes
CREATE TABLE IF NOT EXISTS order_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    from_area area,
    to_area area,
    pieces INTEGER,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS order_history_pkey ON order_history(id);

-- Piezas de la orden
CREATE TABLE IF NOT EXISTS order_pieces (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    area area NOT NULL,
    pieces INTEGER NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS order_pieces_pkey ON order_pieces(id);

-- Transferencias de órdenes
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    from_area area NOT NULL,
    to_area area NOT NULL,
    pieces INTEGER NOT NULL,
    status transfer_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER NOT NULL,
    processed_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    processed_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS transfers_pkey ON transfers(id);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    transfer_id INTEGER,
    order_id INTEGER,
    reposition_id INTEGER,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON notifications(id);
CREATE INDEX IF NOT EXISTS idx_notifications_reposition_id ON notifications(reposition_id);

-- Tabla de sesión
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS session_pkey ON session(sid);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Tabla de reposiciones
CREATE TABLE IF NOT EXISTS repositions (
    id SERIAL PRIMARY KEY,
    folio TEXT UNIQUE NOT NULL,
    type reposition_type NOT NULL,
    solicitante_nombre TEXT NOT NULL,
    solicitante_area area NOT NULL,
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT now(),
    no_solicitud TEXT NOT NULL,
    no_hoja TEXT,
    fecha_corte TEXT,
    causante_dano TEXT NOT NULL,
    tipo_accidente TEXT NOT NULL,
    otro_accidente TEXT,
    descripcion_suceso TEXT NOT NULL,
    modelo_prenda TEXT NOT NULL,
    tela TEXT NOT NULL,
    color TEXT NOT NULL,
    tipo_pieza TEXT NOT NULL,
    consumo_tela REAL,
    urgencia urgency NOT NULL,
    observaciones TEXT,
    materiales_implicados TEXT,
    volver_hacer TEXT,
    current_area area NOT NULL,
    status reposition_status NOT NULL DEFAULT 'pendiente',
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT repositions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT repositions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id)
);


-- Agregar la columna materiales_implicados si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'repositions' AND column_name = 'materiales_implicados') THEN
        ALTER TABLE repositions ADD COLUMN materiales_implicados TEXT;
    END IF;
END
$$;

-- Historial de reposiciones
CREATE TABLE IF NOT EXISTS reposition_history (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    from_area VARCHAR(50),
    to_area VARCHAR(50),
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT reposition_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Piezas de reposición
CREATE TABLE IF NOT EXISTS reposition_pieces (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    talla TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    folio_original TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Productos adicionales de reposición
CREATE TABLE IF NOT EXISTS reposition_products (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    modelo_prenda TEXT NOT NULL,
    tela TEXT NOT NULL,
    color TEXT NOT NULL,
    tipo_pieza TEXT NOT NULL,
    consumo_tela REAL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT reposition_products_reposition_id_fkey 
        FOREIGN KEY (reposition_id) REFERENCES repositions(id) ON DELETE CASCADE
);

-- Telas de contraste de reposición
CREATE TABLE IF NOT EXISTS reposition_contrast_fabrics (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    tela TEXT NOT NULL,
    color TEXT NOT NULL,
    consumo REAL NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT reposition_contrast_fabrics_reposition_id_fkey 
        FOREIGN KEY (reposition_id) REFERENCES repositions(id) ON DELETE CASCADE
);

-- Tiempos de reposición por área
CREATE TABLE IF NOT EXISTS reposition_timers (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    area area NOT NULL,
    user_id INTEGER NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    elapsed_minutes REAL,
    is_running BOOLEAN DEFAULT false,
    manual_start_time VARCHAR(5), -- HH:MM format
    manual_end_time VARCHAR(5), -- HH:MM format
    manual_date VARCHAR(10), -- YYYY-MM-DD format
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT reposition_timers_reposition_id_fkey 
        FOREIGN KEY (reposition_id) REFERENCES repositions(id) ON DELETE CASCADE,
    CONSTRAINT reposition_timers_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Agregar las columnas a la tabla existente si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reposition_timers' AND column_name = 'manual_start_time') THEN
        ALTER TABLE reposition_timers ADD COLUMN manual_start_time VARCHAR(5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reposition_timers' AND column_name = 'manual_end_time') THEN
        ALTER TABLE reposition_timers ADD COLUMN manual_end_time VARCHAR(5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reposition_timers' AND column_name = 'manual_date') THEN
        ALTER TABLE reposition_timers ADD COLUMN manual_date VARCHAR(10);
    END IF;
END
$$;

-- Transferencias de reposiciones
CREATE TABLE IF NOT EXISTS reposition_transfers (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    from_area VARCHAR(50) NOT NULL,
    to_area VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    processed_by INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    processed_at TIMESTAMP,
    CONSTRAINT reposition_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT reposition_transfers_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- Contraseñas de administrador
CREATE TABLE IF NOT EXISTS admin_passwords (
    id SERIAL PRIMARY KEY,
    password TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT admin_passwords_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Eventos en la agenda (debe ir al final porque depende de users)
CREATE TABLE IF NOT EXISTS agenda_events (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,
    assigned_to_area area NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date VARCHAR(10) NOT NULL,  -- Formato YYYY-MM-DD
    time VARCHAR(5) NOT NULL,   -- Formato HH:MM
    priority VARCHAR(10) NOT NULL DEFAULT 'media',
    status VARCHAR(15) NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT agenda_events_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabla de materiales de reposición
CREATE TABLE IF NOT EXISTS reposition_materials (
    id SERIAL PRIMARY KEY,
    reposition_id INTEGER NOT NULL,
    material_status material_status NOT NULL DEFAULT 'disponible',
    missing_materials TEXT,
    notes TEXT,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    pause_reason TEXT,
    paused_by INTEGER,
    paused_at TIMESTAMP,
    resumed_by INTEGER,
    resumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT reposition_materials_reposition_id_fkey 
        FOREIGN KEY (reposition_id) REFERENCES repositions(id) ON DELETE CASCADE,
    CONSTRAINT reposition_materials_paused_by_fkey 
        FOREIGN KEY (paused_by) REFERENCES users(id),
    CONSTRAINT reposition_materials_resumed_by_fkey 
        FOREIGN KEY (resumed_by) REFERENCES users(id)
);

-- Tabla de documentos para pedidos y reposiciones
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    order_id INTEGER,
    reposition_id INTEGER,
    uploaded_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT documents_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT documents_reposition_id_fkey 
        FOREIGN KEY (reposition_id) REFERENCES repositions(id) ON DELETE CASCADE,
    CONSTRAINT documents_uploaded_by_fkey 
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
);