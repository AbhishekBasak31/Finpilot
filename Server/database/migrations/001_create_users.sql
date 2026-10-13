CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_status
ON users(status);

CREATE INDEX idx_users_created_at
ON users(created_at);