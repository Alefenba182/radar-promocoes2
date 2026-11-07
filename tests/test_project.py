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
        self.assertIn("Configuração de buscas sem precisar de computador", readme)



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

    def test_scheduler_is_configured_for_fifteen_minutes(self):
        scheduler = (ROOT / "supabase/schedule-scan.sql").read_text(encoding="utf-8")
        self.assertIn("'*/15 * * * *'", scheduler)
        self.assertIn("vault.decrypted_secrets", scheduler)
        self.assertIn("functions/v1/scan-offers", scheduler)


if __name__ == "__main__":
    unittest.main()
