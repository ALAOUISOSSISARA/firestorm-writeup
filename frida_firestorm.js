Java.perform(function() {

    function getPassword() {
        console.log("[*] Recherche d'instances de MainActivity...");

        Java.choose('com.pwnsec.firestorm.MainActivity', {

            onMatch: function(instance) {
                console.log("[+] Instance trouvée : " + instance);
                try {
                    var pass = instance.Password();
                    console.log("[+] Mot de passe Firebase : " + pass);
                } catch (e) {
                    console.log("[-] Erreur : " + e);
                }
            },

            onComplete: function() {
                console.log("[*] Recherche terminée.");
            }
        });
    }

    console.log("[*] Script chargé. Attente 3 secondes...");
    setTimeout(getPassword, 3000);
});