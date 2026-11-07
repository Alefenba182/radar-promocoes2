"""Testes iniciais do Radar de Promoções.

Execute com: python -m unittest discover -s tests -v
"""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ProjectDocumentationTests(unittest.TestCase):
    def test_readme_exists(self):
        self.assertTrue((ROOT / "README.md").is_file())

    def test_readme_has_project_title(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("# Radar de Promoções", readme)

    def test_readme_documents_mobile_configuration_goal(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("configuração de buscas sem precisar de computador", readme.lower())



class DashboardFeatureTests(unittest.TestCase):
    def test_dashboard_can_connect_mercado_livre(self):
        dashboard = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("dynamic-function?action=start", dashboard)
        self.assertIn("Conectar Mercado Livre", dashboard)

    def test_dashboard_loads_and_renders_saved_offers(self):
        dashboard = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="offers"', dashboard)
        self.assertIn('id="refresh"', dashboard)
        self.assertIn("async function loadOffers()", dashboard)
        self.assertIn("renderOffers(data||[])", dashboard)

    def test_offer_rendering_uses_text_content_for_titles(self):
        dashboard = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("title.textContent=offer.title", dashboard)
        self.assertNotIn("innerHTML=offer.title", dashboard)


    def test_dashboard_has_manual_scan_action(self):
        dashboard = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="scan"', dashboard)
        self.assertIn("Buscar ofertas agora", dashboard)
        self.assertIn('client.functions.invoke("scan-offers"', dashboard)

    def test_scanner_accepts_user_jwt_and_limits_manual_scan(self):
        scanner = (ROOT / "supabase/functions/scan-offers/index.ts").read_text(encoding="utf-8")
        self.assertIn("admin.auth.getUser(bearerToken)", scanner)
        self.assertIn('configQuery.eq("user_id", requestedUserId)', scanner)
        self.assertIn('bearerToken === cronSecret', scanner)

    def test_scanner_has_catalog_fallback_for_general_search_403(self):
        scanner = (ROOT / "supabase/functions/scan-offers/index.ts").read_text(encoding="utf-8")
        self.assertIn("searchCatalogOffers", scanner)
        self.assertIn("https://api.mercadolibre.com/products/search", scanner)
        self.assertIn("/items", scanner)
        self.assertIn('source = "mercado_livre_catalog"', scanner)
        self.assertIn("response.status === 403", scanner)

    def test_scheduler_is_configured_for_fifteen_minutes(self):
        scheduler = (ROOT / "supabase/schedule-scan.sql").read_text(encoding="utf-8")
        self.assertIn("'*/15 * * * *'", scheduler)
        self.assertIn("vault.decrypted_secrets", scheduler)
        self.assertIn("functions/v1/scan-offers", scheduler)


if __name__ == "__main__":
    unittest.main()
