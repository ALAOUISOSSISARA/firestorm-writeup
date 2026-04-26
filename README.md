# FireStorm — Android Reverse Engineering Writeup

 
**Niveau :** Medium  
**Techniques :** Reverse Android (Jadx), Hooking Java (Frida), Authentification Firebase  

---

## Objectif du Challenge

L'application Android FireStorm contient une methode `Password()` dans `MainActivity` qui genere un mot de passe pour s'authentifier sur une base de donnees Firebase. Cette methode n'est jamais appelee dans le flux normal de l'application.

L'objectif est de :
1. Forcer l'execution de `Password()` via Frida
2. Recuperer le mot de passe genere
3. S'authentifier sur Firebase pour lire le flag

---

## Environnement

| Outil | Version |
|-------|---------|
| Frida | 17.9.1 |
| Android Emulator | Pixel 5 — API 30 (x86_64, sans Google Play) |
| ADB | SDK Platform Tools |
| Python | 3.x + pyrebase4 |
| Jadx | Jadx-GUI |

Important : Utiliser un emulateur sans Google Play (Google APIs uniquement) pour pouvoir executer `adb root` et lancer frida-server.

---

## Etape 1 — Installation de l'APK

```bash
adb root
adb install FireStorm.apk
```



---

## Etape 2 — Analyse statique avec Jadx

Ouvrir `FireStorm.apk` dans Jadx-GUI et naviguer vers :

```
com.pwnsec.firestorm > MainActivity
```

### Methode Password() identifiee

```java
public String Password() {
    String s1 = getString(R.string.s1);
    String s2 = getString(R.string.s2);
    // ... recuperation de strings depuis strings.xml ...

    // Appel a la fonction native dans libfirestorm.so
    String randomPart = generateRandomStrings(...);

    // Construction du mot de passe final
    String finalPassword = s1 + s2 + randomPart + ...;

    return finalPassword;
}
```

Points cles :
- La methode combine des strings statiques (strings.xml) et une partie dynamique generee par la librairie native `libfirestorm.so`
- Cette methode n'est appelee nulle part dans le code
- Le fichier `strings.xml` contient aussi l'email Firebase : `TK757567@pwnsec.xyz`

### Configuration Firebase extraite de strings.xml

```xml
<string name="firebase_api_key">AIzaSyAXsK0qsx4RuLSA9C8IPSWd0eQ67HVHuJY</string>
<string name="firebase_email">TK757567@pwnsec.xyz</string>
<string name="firebase_database_url">https://firestorm-9d3db-default-rtdb.firebaseio.com</string>
```

---

## Etape 3 — Setup Frida Server

### Verifier l'architecture de l'emulateur

```bash
adb shell getprop ro.product.cpu.abi
# x86_64
```

### Telecharger le bon frida-server

Telecharger `frida-server-17.9.1-android-x86_64` depuis :
https://github.com/frida/frida/releases/tag/17.9.1

### Pousser et lancer frida-server

```bash
adb push frida-server-17.9.1-android-x86_64 /data/local/tmp/frida-server
adb shell chmod +x /data/local/tmp/frida-server
adb shell "/data/local/tmp/frida-server &"
```

### Verifier que frida-server tourne

```bash
frida-ps -U
```

![Frida server lance](screenshots/frida_server_launch.webp)

---

## Etape 4 — Script Frida : Forcer l'appel de Password()

### Script frida_firestorm.js

```javascript
Java.perform(function() {

    function getPassword() {
        console.log("[*] Recherche d'instances de MainActivity...");

        Java.choose('com.pwnsec.firestorm.MainActivity', {

            onMatch: function(instance) {
                console.log("[+] Instance trouvee : " + instance);
                try {
                    var pass = instance.Password();
                    console.log("[+] Mot de passe Firebase : " + pass);
                } catch (e) {
                    console.log("[-] Erreur : " + e);
                }
            },

            onComplete: function() {
                console.log("[*] Recherche terminee.");
            }
        });
    }

    console.log("[*] Script charge. Attente 3 secondes...");
    setTimeout(getPassword, 3000);
});
```

### Lancement du script

```bash
frida -U -f com.pwnsec.firestorm -l frida_firestorm.js
```

### Resultat — Mot de passe obtenu

![Frida password extrait](screenshots/frida_results.webp)

```
[+] Mot de passe Firebase : C7_dotpsC7t7f_._In_i.IdttpaofoaIIdIdnndIfC
```

Note : Ce mot de passe change a chaque lancement car il depend de la fonction native `generateRandomStrings()`.

---

## Etape 5 — Authentification Firebase et Recuperation du Flag

### Script get_flag.py

```python
import pyrebase

config = {
    "apiKey": "AIzaSyAXsK0qsx4RuLSA9C8IPSWd0eQ67HVHuJY",
    "authDomain": "firestorm-9d3db.firebaseapp.com",
    "databaseURL": "https://firestorm-9d3db-default-rtdb.firebaseio.com",
    "storageBucket": "firestorm-9d3db.appspot.com",
    "projectId": "firestorm-9d3db"
}

firebase = pyrebase.initialize_app(config)
auth = firebase.auth()

email = "TK757567@pwnsec.xyz"
password = "C7_dotpsC7t7f_._In_i.IdttpaofoaIIdIdnndIfC"

user = auth.sign_in_with_email_and_password(email, password)
print("Connexion reussie!")

db = firebase.database()
flag_data = db.get(user['idToken'])
print("FLAG :")
print(flag_data.val())
```

### Execution

```bash
pip install pyrebase4
python get_flag.py
```

![Flag recupere](screenshots/flag_result.webp)

---

## Flag

```
PWNSEC{C0ngr4ts_Th4t_w45_4N_345y_P4$$w0rd_t0_G3t!!!_0R_!5_!t???}
```

---

## Resume du Flow

```
FireStorm.apk
    └── MainActivity.Password()  <- jamais appelee normalement
            ├── strings statiques (strings.xml)
            └── generateRandomStrings()  <- fonction native (libfirestorm.so)
                        |
                Frida force l'appel via Java.choose()
                        |
                Mot de passe extrait
                        |
                Auth Firebase (pyrebase)
                        |
                FLAG
```

---

## Structure du repo

```
firestorm-writeup/
├── README.md
├── frida_firestorm.js
├── get_flag.py
└── screenshots/
    ├── app_firestorm.png
    ├── frida_server_launch.png
    ├── frida_password.png
    └── flag_result.png
```

---

Writeup realise dans le cadre du lab 18 — FireStorm Challenge
