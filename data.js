/* Site content shared by the homepage graph and the Research, Teaching and module pages.
   Edit here: the graph and the pages all update.

   Each course gets its own page at module.html?id=<code in lowercase>. Besides the
   fields below, a course may have any of these optional ones:
     "trimester":   "Autumn"                      when it runs
     "description": "Two or three sentences."     what the module is about
     "topics":      ["Topic one", "Topic two"]    main topics covered
     "years":       "2022–"                       when you taught it (e.g. "2021–2023" for past ones)
     "links":       [{ "label": "Lecture notes", "url": "https://…" }]   materials */
window.SITE = {
  "themes": [
    {
      "id": "learning",
      "title": "Distributed & split learning",
      "text": "Training models across resource-constrained clients and edge helpers: scheduling and workflow optimisation for parallel and multi-hop split learning, and decentralised federated learning."
    },
    {
      "id": "ledgers",
      "title": "Distributed ledgers & auditing",
      "text": "Ledgers that run on mobile devices, and cryptographic protocols that keep transactions consistent and private across independent organisations, for example in financial auditing."
    },
    {
      "id": "incentives",
      "title": "Incentives & reputation",
      "text": "Mechanism design for device-to-device ecosystems and crowdsourcing: rewarding contributors, building reputation without a central authority, and verifying work anonymously."
    },
    {
      "id": "mobile",
      "title": "Mobile & edge computing",
      "text": "Offloading computation between phones, cloudlets and the cloud, and the systems behind mobile augmented reality."
    }
  ],
  "courses": [
    {
      "code": "COMP30520",
      "title": "Cloud Computing",
      "short": "Cloud Computing (UG)",
      "level": "Undergraduate · 5 credits",
      "url": "https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=MODULE&MODULE=COMP30520",
      "past": false
    },
    {
      "code": "COMP41770",
      "title": "Blockchain & Decentralisation",
      "short": "Blockchain",
      "level": "Postgraduate · 5 credits",
      "url": "https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=MODULE&MODULE=COMP41770",
      "past": false
    },
    {
      "code": "COMP47780",
      "title": "Cloud Computing",
      "short": "Cloud Computing (MSc)",
      "level": "Postgraduate (MSc) · 10 credits",
      "url": "https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=MODULE&MODULE=COMP47780",
      "past": false
    },
    {
      "code": "COMP20270",
      "title": "Python OOP",
      "short": "Python OOP",
      "level": "MSc (Conversion) & Higher Diploma · 5 credits",
      "url": "https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=MODULE&MODULE=COMP20270",
      "past": true
    },
    {
      "code": "COMP30860",
      "title": "Web Development",
      "short": "Web Development",
      "level": "Undergraduate · 5 credits",
      "url": "https://hub.ucd.ie/usis/!W_HU_MENU.P_PUBLISH?p_tag=MODULE&MODULE=COMP30860",
      "past": true
    }
  ]
};
