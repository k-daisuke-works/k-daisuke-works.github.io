import zipfile, re
import sys

def extract_text(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        slides = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
        slides.sort(key=lambda x: int(re.search(r'\d+', x).group()))
        for idx, s in enumerate(slides):
            xml = z.read(s).decode('utf-8')
            text = re.sub(r'<[^>]+>', ' ', xml)
            text = ' '.join(text.split())
            if text.strip():
                print(f"--- Slide {idx+1} ---")
                print(text)

if __name__ == '__main__':
    extract_text(sys.argv[1])
