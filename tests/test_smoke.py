"""Smoke test: the package and its subpackages import cleanly."""


def test_package_imports() -> None:
    import simplesave
    import simplesave.api.main
    import simplesave.core.config
    import simplesave.db.base
    import simplesave.engine

    assert simplesave.engine is not None


def test_settings_load() -> None:
    from simplesave.core.config import get_settings

    settings = get_settings()
    # Skeleton stage: keys are empty until a Supabase project is configured.
    assert settings.database_url == ""
