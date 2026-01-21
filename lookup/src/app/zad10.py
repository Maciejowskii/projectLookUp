from abc import ABC, abstractmethod

class Pytanie(ABC):
    """Klasa abstrakcyjna reprezentująca pytanie w quizie"""
    
    def __init__(self, tresc_pytania, nazwa_pliku):
        """
        Konstruktor dwuargumentowy
        
        Args:
            tresc_pytania (str): Treść pytania
            nazwa_pliku (str): Nazwa pliku ze zdjęciem
        """
        self._tresc_pytania = tresc_pytania
        self._nazwa_pliku = nazwa_pliku
        self._czy_poprawna = False
    
    @abstractmethod
    def sprawdz_odpowiedz(self, odpowiedz):
        """
        Metoda abstrakcyjna sprawdzająca odpowiedź
        
        Args:
            odpowiedz (str): Odpowiedź użytkownika ('A', 'B' lub 'C')
            
        Returns:
            bool: Czy odpowiedź jest poprawna
        """
        pass


class PytanieZamkniete(Pytanie):
    """Klasa reprezentująca pytanie zamknięte z trzema odpowiedziami"""
    
    def __init__(self, tresc_pytania, nazwa_pliku, odpowiedz_a, 
                 odpowiedz_b, odpowiedz_c, poprawna_odpowiedz):
        """
        Konstruktor sześcioargumentowy
        
        Args:
            tresc_pytania (str): Treść pytania
            nazwa_pliku (str): Nazwa pliku ze zdjęciem
            odpowiedz_a (str): Treść odpowiedzi A
            odpowiedz_b (str): Treść odpowiedzi B
            odpowiedz_c (str): Treść odpowiedzi C
            poprawna_odpowiedz (str): Poprawna odpowiedź ('A', 'B' lub 'C')
        """
        super().__init__(tresc_pytania, nazwa_pliku)
        self.__odpowiedz_a = odpowiedz_a
        self.__odpowiedz_b = odpowiedz_b
        self.__odpowiedz_c = odpowiedz_c
        self.__poprawna_odpowiedz = poprawna_odpowiedz
    
    def sprawdz_odpowiedz(self, odpowiedz):
        """
        Sprawdza czy odpowiedź użytkownika jest poprawna
        
        Args:
            odpowiedz (str): Odpowiedź użytkownika ('A', 'B' lub 'C')
            
        Returns:
            bool: True jeśli odpowiedź poprawna, False w przeciwnym razie
        """
        if odpowiedz.upper() == self.__poprawna_odpowiedz.upper():
            self._czy_poprawna = True
        else:
            self._czy_poprawna = False
        
        return self._czy_poprawna
    
    def wyswietl_pytanie(self):
        """Wyświetla pytanie z odpowiedziami"""
        print(f"\n{self._tresc_pytania}")
        print(f"Plik graficzny: {self._nazwa_pliku}")
        print(f"A) {self.__odpowiedz_a}")
        print(f"B) {self.__odpowiedz_b}")
        print(f"C) {self.__odpowiedz_c}")
    
    def get_tresc_pytania(self):
        return self._tresc_pytania
    
    def get_nazwa_pliku(self):
        return self._nazwa_pliku


# Część 3: Testowanie działania klas
def main():
    """Funkcja główna testująca działanie klas"""
    
    print("=== QUIZ O GÓRACH ===\n")
    
    # Tworzenie pytań quizu zgodnie z plikiem pytania.txt
    pytania = [
        PytanieZamkniete(
            "Które to schronisko?",
            "zad1.jpg",
            "Na Rysiance.",
            "Na Wielkiej Raczy.",
            "Na Wielkiej Rycerzowej.",
            "B"
        ),
        PytanieZamkniete(
            "Zwierzę na zdjęciu to",
            "zad2.jpg",
            "owczarek.",
            "wilk.",
            "kozica.",
            "A"
        ),
        PytanieZamkniete(
            "W oddali są widoczne",
            "zad3.jpg",
            "Himalaje.",
            "Alpy.",
            "Tatry.",
            "C"
        )
    ]
    
    punkty = 0
    
    # Iteracja przez pytania
    for i, pytanie in enumerate(pytania, 1):
        pytanie.wyswietl_pytanie()
        
        # Pobieranie odpowiedzi od użytkownika
        while True:
            odpowiedz = input("\nTwoja odpowiedź (A/B/C): ").strip().upper()
            if odpowiedz in ['A', 'B', 'C']:
                break
            else:
                print("Nieprawidłowa odpowiedź! Wybierz A, B lub C.")
        
        # Sprawdzenie odpowiedzi
        if pytanie.sprawdz_odpowiedz(odpowiedz):
            print("✓ Poprawna odpowiedź!")
            punkty += 1
        else:
            print("✗ Niepoprawna odpowiedź!")
    
    # Wyświetlenie wyniku końcowego
    print(f"\n{'='*40}")
    print(f"WYNIK KOŃCOWY: {punkty}/{len(pytania)} punktów")
    print(f"Procent poprawnych odpowiedzi: {(punkty/len(pytania)*100):.1f}%")
    print(f"{'='*40}")


if __name__ == "__main__":
    main()


docker exec -it pgadmin-q4o4g4wo4owkws0soc0sgkwg python3 << 'EOF'
import sqlite3
from werkzeug.security import generate_password_hash

conn = sqlite3.connect('/var/lib/pgadmin/pgadmin4.db')
new_password = 'gigaMacius1@234'
hashed = generate_password_hash(new_password)
conn.execute("UPDATE USER SET PASSWORD = ?, LOCKED = 0, LOGIN_ATTEMPTS = 0 WHERE EMAIL = 'szkolmt@gmail.com'", (hashed,))
conn.commit()
conn.close()
print('Password changed successfully!')
EOF
