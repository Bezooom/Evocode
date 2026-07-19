#!/usr/bin/env python3
"""
Проверка установленных зависимостей для paper2ppt-ru
"""

import sys

def check_dependency(module_name, package_name=None):
    """Проверить установку модуля"""
    if package_name is None:
        package_name = module_name
    
    try:
        __import__(module_name)
        print(f"✅ {package_name}: установлен")
        return True
    except ImportError:
        print(f"❌ {package_name}: НЕ установлен")
        return False

def main():
    print("="*60)
    print("ПРОВЕРКА ЗАВИСИМОСТЕЙ ДЛЯ PAPER2PPT-RU")
    print("="*60 + "\n")
    
    # Основные зависимости
    print("Основные зависимости:")
    required = [
        ("pptx", "python-pptx"),
        ("fitz", "PyMuPDF"),
        ("requests", "requests"),
        ("PIL", "pillow"),
        ("matplotlib", "matplotlib"),
    ]
    
    required_ok = all(check_dependency(mod, pkg) for mod, pkg in required)
    print()
    
    # Опциональные зависимости
    print("Опциональные зависимости:")
    optional = [
        ("arxiv", "arxiv"),
        ("Bio", "biopython"),
        ("scholarly", "scholarly"),
        ("pdf2image", "pdf2image"),
        ("sympy", "sympy"),
        ("nltk", "nltk"),
        ("spacy", "spacy"),
        ("pandas", "pandas"),
        ("openpyxl", "openpyxl"),
    ]
    
    for mod, pkg in optional:
        check_dependency(mod, pkg)
    print()
    
    # Проверка версий
    print("Версии основных библиотек:")
    try:
        import pptx
        print(f"  python-pptx: {pptx.__version__}")
    except:
        pass
    
    try:
        import fitz
        print(f"  PyMuPDF: {fitz.version[0]}")
    except:
        pass
    
    try:
        import requests
        print(f"  requests: {requests.__version__}")
    except:
        pass
    
    try:
        import PIL
        print(f"  pillow: {PIL.__version__}")
    except:
        pass
    
    try:
        import matplotlib
        print(f"  matplotlib: {matplotlib.__version__}")
    except:
        pass
    
    print()
    
    # Проверка Python версии
    print(f"Python версия: {sys.version}")
    if sys.version_info < (3, 8):
        print("⚠️  Рекомендуется Python 3.8 или выше")
    print()
    
    # Итог
    print("="*60)
    if required_ok:
        print("✅ Все основные зависимости установлены")
        print("Навык paper2ppt-ru готов к использованию!")
    else:
        print("❌ Не все основные зависимости установлены")
        print("\nУстановите недостающие пакеты:")
        print("  pip install -r requirements.txt")
        print("\nИли:")
        print("  pip install python-pptx PyMuPDF requests pillow matplotlib")
    print("="*60)
    
    return 0 if required_ok else 1

if __name__ == "__main__":
    sys.exit(main())
