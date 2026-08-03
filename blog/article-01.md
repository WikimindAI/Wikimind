---
title: "Comment fonctionne vraiment un chatbot moderne"
meta_description: "Derrière la fluidité d'un chatbot comme ChatGPT ou Claude se cachent des mécanismes précis. Voici comment les grands modèles de langage génèrent du texte, gèrent le contexte et apprennent à répondre."
slug: comment-fonctionne-chatbot-moderne
mots_cles: [chatbot, LLM, modèle de langage, intelligence artificielle, transformer]
---

# Comment fonctionne vraiment un chatbot moderne

Quand on pose une question à un chatbot et qu'on obtient une réponse cohérente en quelques secondes, l'effet peut sembler presque magique. Ce n'est pas de la magie, mais le résultat d'une architecture logicielle précise qui a mis des décennies à mûrir. Comprendre comment ces systèmes fonctionnent permet de mieux les utiliser, de reconnaître leurs limites et de ne pas se laisser piéger par leurs failles.

## Du texte brut à la prédiction de tokens

Un grand modèle de langage, souvent désigné par l'acronyme LLM (Large Language Model), ne "comprend" pas le langage au sens humain du terme. Il prédit, avec une probabilité calculée, quel fragment de texte doit suivre le précédent.

Le premier travail invisible est la **tokenisation**. Avant d'analyser quoi que ce soit, le modèle découpe le texte en unités appelées tokens. Ce ne sont pas nécessairement des mots entiers. Le mot "intelligence" peut être découpé en deux ou trois tokens selon le modèle ; un caractère chinois peut en être un seul. En anglais, un token correspond à peu près à 0,75 mot en moyenne.

Une fois tokenisé, chaque fragment reçoit un vecteur numérique, une position dans un espace à plusieurs milliers de dimensions. La signification d'un mot ne dépend pas de lui seul, mais de son rapport à tous les autres mots du vocabulaire. "Banque" placé dans une phrase sur la finance n'occupe pas la même position vectorielle que "banque" dans une phrase sur une rivière.

## L'architecture Transformer et l'attention

Le mécanisme qui a véritablement changé la donne s'appelle l'**attention** (attention mechanism), introduit dans l'article fondateur "Attention is All You Need" publié par des chercheurs de Google en 2017.

L'idée centrale est simple à intuiter : pour comprendre un mot dans une phrase, il faut regarder l'ensemble des autres mots et décider lesquels comptent le plus. Dans la phrase "Le chat mange la souris parce qu'il avait faim", pour comprendre à quoi renvoie "il", le modèle doit accorder une forte attention à "chat", pas à "souris". L'attention permet de modéliser ces relations à travers n'importe quelle distance dans le texte.

Les modèles modernes empilent des dizaines, parfois des centaines de couches d'attention. Chaque couche raffine la représentation en ajoutant un niveau de compréhension supplémentaire. Les premières couches repèrent les structures syntaxiques basiques ; les couches profondes traitent des relations sémantiques plus abstraites.

## L'entraînement : des milliards de phrases, des milliards de corrections

Un LLM apprend en lisant du texte, beaucoup de texte. Des sources comme Wikipedia, des livres numérisés, des sites web, des bases de code constituent une bonne partie des données d'entraînement. Pour un modèle comme GPT-4, on parle de centaines de milliards de tokens.

La tâche d'entraînement de base est la **prédiction du token suivant**. Le modèle voit une séquence, prédit le prochain mot, compare sa prédiction à la réalité, et ajuste ses paramètres internes pour réduire l'erreur. Ce processus, répété des milliards de fois sur des infrastructures de calcul massives, produit un modèle capable de généraliser.

Mais la prédiction brute ne suffit pas à produire un assistant utile. Une deuxième phase entre en jeu : le **fine-tuning par renforcement humain** (RLHF, Reinforcement Learning from Human Feedback). Des évaluateurs humains comparent plusieurs réponses générées par le modèle et indiquent laquelle est préférable. Ces jugements entraînent un second modèle, dit "modèle de récompense", qui apprend à évaluer la qualité des réponses. Le LLM principal est ensuite optimisé pour maximiser ces scores.

## La fenêtre de contexte : une mémoire limitée

Un détail crucial que beaucoup ignorent : un chatbot ne "se souvient" de rien entre deux sessions distinctes. Tout ce qu'il "sait" lors d'une conversation, c'est le contenu de la fenêtre de contexte en cours, c'est-à-dire l'ensemble des messages échangés depuis le début de la conversation.

Cette fenêtre a une taille maximale, exprimée en tokens. Les premiers modèles géraient 2 048 tokens. Les modèles actuels atteignent souvent 128 000 tokens, et certains vont bien au-delà. Plus la fenêtre est longue, plus le modèle peut tenir compte d'un document entier, d'une longue discussion ou d'un fichier de code volumineux.

Quand la fenêtre est pleine, les échanges les plus anciens disparaissent. C'est pourquoi, dans une très longue conversation, un chatbot peut sembler "oublier" quelque chose dit au début.

## La température et le caractère non déterministe

Contrairement à un moteur de recherche qui renvoie toujours les mêmes résultats pour une même requête, un chatbot est non déterministe. Il ne choisit pas systématiquement le token le plus probable, mais tire au sort parmi les candidats selon une distribution de probabilité modulée par un paramètre appelé **température**.

Une température basse (proche de 0) rend le modèle prévisible et conservateur : il prend presque toujours le token le plus probable. Une température élevée (proche de 1 ou au-delà) le rend plus créatif, parfois incohérent. C'est pourquoi poser deux fois la même question peut donner des réponses légèrement différentes.

Sur des plateformes comme [Wikimind](https://wikimindai.github.io/Wikimind/), qui agrège plusieurs modèles différents (Claude, Gemini, DeepSeek, Groq, Cohere...), on constate d'ailleurs que chaque modèle a sa propre "personnalité" de réponse, même face aux mêmes questions. Ce n'est pas un artefact : c'est la conséquence directe des choix faits lors de l'entraînement et des paramètres d'inférence.

## Ce que le modèle ne fait pas

Il ne cherche pas sur Internet en temps réel (sauf si une fonctionnalité de recherche web lui est explicitement attachée). Il ne "sait" pas quelle heure il est. Il ne peut pas accéder à des fichiers sur votre ordinateur, à moins qu'on ne lui transmette leur contenu dans la fenêtre de contexte.

Il ne raisonne pas non plus dans le sens philosophique du terme. Il produit des séquences de texte statistiquement cohérentes. Parfois ces séquences ressemblent à du raisonnement ; parfois elles produisent des affirmations fausses présentées avec la même confiance que des vérités. Ce phénomène est connu sous le nom d'**hallucination**, et c'est l'une des limites fondamentales à connaître.

## Pourquoi le choix du modèle compte

Tous les LLMs ne se comportent pas de la même façon. Certains sont entraînés davantage sur du code, d'autres sur des données médicales ou juridiques. Certains sont optimisés pour la vitesse (Groq, Cerebras), d'autres pour la profondeur de raisonnement (Claude 3.7 d'Anthropic, o3 d'OpenAI).

Connaître les forces et les faiblesses de chaque modèle aide à poser la bonne question au bon outil. Un problème mathématique complexe ne demande pas le même modèle qu'une demande de reformulation stylistique.

Comprendre que derrière une interface simple se trouve une mécanique précise avec des limites bien définies, c'est la première étape pour utiliser ces outils de façon vraiment efficace.
