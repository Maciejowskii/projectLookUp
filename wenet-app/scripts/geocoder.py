import psycopg2
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import re

# ===== KONFIGURACJA =====
DB_HOST = "127.0.0.1"
DB_PORT = "5433"
DB_NAME = "wenet"
DB_USER = "postgres"
DB_PASS = "wenet123"

USER_AGENT = "moj_katalog_firm_v2_fix"

def connect_db():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASS
    )
    return conn

def clean_address(addr):
    """
    Czyści adres pod Nominatim:
    - usuwa 'ul.', 'al.', 'pl.'
    - usuwa numer lokalu (np. '15/4' -> '15')
    """
    if not addr: return ""
    
    # 1. Usuń prefiksy ulic (bez znaczenia dla wielkości liter)
    addr = re.sub(r'(?i)\b(ul\.|al\.|pl\.|os\.)\s?', '', addr)
    
    # 2. Usuń numer lokalu (wszystko po '/' jeśli są cyfry)
    # Np. "Warszawska 10/25" -> "Warszawska 10"
    if "/" in addr:
        addr = addr.split("/")[0]
        
    return addr.strip()

def main():
    conn = connect_db()
    
    # 1. Upewnij się (ponownie), że kolumny są
    cur = conn.cursor()
    cur.execute("""
        ALTER TABLE "Company" 
        ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
    """)
    conn.commit()
    
    # 2. Pobierz firmy bez współrzędnych
    print("📍 Pobieranie firm do geokodowania...")
    cur.execute("""
        SELECT id, name, address, city, zip 
        FROM "Company" 
        WHERE lat IS NULL 
          AND city IS NOT NULL 
          AND city != ''
        LIMIT 50
    """)
    rows = cur.fetchall()
    
    if not rows:
        print("🎉 Wszystkie firmy mają już lat/lng (lub brak firm do przetworzenia).")
        return

    geolocator = Nominatim(user_agent=USER_AGENT, timeout=10)

    for row in rows:
        comp_id, name, raw_address, city, zipcode = row
        
        # Odrzucamy "Brak adresu" z próby dokładnej, zostawiamy tylko miasto
        has_street = raw_address and raw_address.lower() != "brak adresu"
        
        cleaned_street = clean_address(raw_address) if has_street else ""
        
        # --- STRATEGIA KASKADOWA ---
        queries_to_try = []
        
        # 1. Najdokładniej: Ulica Numer, Kod Miasto
        if has_street:
            queries_to_try.append(f"{cleaned_street}, {zipcode} {city}")
            
        # 2. Tylko Ulica, Miasto (bez kodu, czasem kod myli)
        if has_street:
            queries_to_try.append(f"{cleaned_street}, {city}")
            
        # 3. Ostateczność: Tylko Kod + Miasto (środek miasta)
        queries_to_try.append(f"{zipcode} {city}")
        
        # 4. Tylko Miasto (jeśli kod błędny)
        queries_to_try.append(f"{city}")

        found_location = None
        
        print(f"\n🏢 Firma: {name}")
        
        for q in queries_to_try:
            print(f"   🔎 Próba: '{q}' ...", end=" ")
            try:
                location = geolocator.geocode(q, country_codes="pl")
                if location:
                    print(f"✅ JEST! ({location.latitude}, {location.longitude})")
                    found_location = location
                    break # Sukces, przerywamy pętlę prób
                else:
                    print("❌")
                time.sleep(1.1) # Szacunek dla API
            except Exception as e:
                print(f"⚠️ Błąd API: {e}")
                time.sleep(2)

        if found_location:
            cur.execute(
                'UPDATE "Company" SET lat=%s, lng=%s WHERE id=%s',
                (found_location.latitude, found_location.longitude, comp_id)
            )
            conn.commit()
        else:
            print("   🚫 Nie udało się zlokalizować tej firmy żadnym sposobem.")
            # Opcjonalnie: ustaw lat=0, lng=0 żeby nie mieliło jej w kółko
            # cur.execute('UPDATE "Company" SET lat=0, lng=0 WHERE id=%s', (comp_id,))
            # conn.commit()

    conn.close()
    print("\n🏁 Koniec paczki.")

if __name__ == "__main__":
    main()
