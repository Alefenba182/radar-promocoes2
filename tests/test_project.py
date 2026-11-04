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


if __name__ == "__main__":
    unittest.main()
