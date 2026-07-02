#!/usr/bin/env bash
# make-voices.sh — Banque audio d'Ange, générée depuis la CHARTE VOCALE (v454).
# La banque est une PROJECTION de la charte : pour changer de voix ou ajouter
# une phrase, éditer la liste ci-dessous puis relancer ce script.
# Moteur : SVOX Pico (apt install libttspico-utils). Sortie : ../audio/*.wav
# Règles de la charte : ≤ 6 mots, une seule idée, jamais technique,
# en cas d'erreur la phrase dit QUOI FAIRE ENSUITE.
set -euo pipefail
cd "$(dirname "$0")/../audio"

gen(){ pico2wave -l fr-FR -w "$1.wav" "$2" && echo "  $1.wav ← « $2 »"; }

echo "Génération de la banque vocale (SVOX Pico fr-FR)…"
gen ange-ecoute     "J'écoute"                                   # réveil (E3)
gen ange-oui        "Oui ?"                                      # re-réveil
gen ange-fait       "C'est fait."                                # action réussie (E4)
gen ange-envoye     "Envoyé."                                    # envoi réussi (E4)
gen ange-annule     "Annulé."                                    # annulation (E5)
gen ange-repete     "Répète autrement."                          # incompris (E5, dit quoi faire)
gen ange-message    "Message ?"                                  # suivi message libre (hors Volant)
gen ange-arret      "Disponible à l'arrêt."                      # action non drivable en Mode Volant
gen ange-instable   "Micro instable, utilise le bouton."         # mode dégradé N1
gen ange-horsligne  "Hors ligne. Je prépare sans envoyer."       # offline
echo "Terminé."
