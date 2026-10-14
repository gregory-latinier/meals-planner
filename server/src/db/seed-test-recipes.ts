import { query, withTransaction } from './index'
import { generateId } from '../lib/auth'

interface RecipeSeedDef {
  title: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  tags: string[]
  instructions: { kind: 'heading' | 'item'; text: string }[]
  ingredients: {
    heading?: string
    name?: string
    quantity?: string
    unit?: string
    note?: string
  }[]
}

export const RECIPES_DATA: RecipeSeedDef[] = [
  {
    title: 'Poulet rôti aux herbes de Provence et grenailles',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 60,
    tags: ['Plat complet', 'Volaille', 'Four', 'Familial'],
    instructions: [
      { kind: 'heading', text: 'Préparation du poulet' },
      { kind: 'item', text: 'Préchauffer le four à 200°C.' },
      { kind: 'item', text: 'Laver et couper les pommes de terre grenailles en deux.' },
      { kind: 'item', text: 'Badigeonner le poulet d’huile d’olive, saler, poivrer et saupoudrer généreusement d’herbes de Provence.' },
      { kind: 'heading', text: 'Cuisson' },
      { kind: 'item', text: 'Disposer le poulet au centre d’un plat à rôtir et entourer des pommes de terre et des gousses d’ail en chemise.' },
      { kind: 'item', text: 'Enfourner pour environ 60 minutes en arrosant régulièrement avec le jus de cuisson.' },
      { kind: 'item', text: 'Laisser reposer 10 minutes sous une feuille d’aluminium avant de découper.' },
    ],
    ingredients: [
      { heading: 'Base' },
      { name: 'Poulet fermier', quantity: '1', unit: 'pièce', note: 'environ 1,5 kg' },
      { name: 'Pommes de terre grenailles', quantity: '800', unit: 'g' },
      { name: 'Gousses d’ail', quantity: '6', unit: 'gousse', note: 'en chemise' },
      { heading: 'Assaisonnement' },
      { name: 'Huile d’olive', quantity: '3', unit: 'c. à soupe' },
      { name: 'Herbes de Provence', quantity: '2', unit: 'c. à café' },
      { name: 'Sel fin', quantity: '1', unit: 'pincée' },
      { name: 'Poivre noir', quantity: '1', unit: 'tour de moulin' },
    ],
  },
  {
    title: 'Dos de cabillaud en croûte d’herbes et purée de panais',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 18,
    tags: ['Poisson', 'Léger', 'Four'],
    instructions: [
      { kind: 'heading', text: 'Préparation de la purée' },
      { kind: 'item', text: 'Éplucher les panais et les couper en dés. Cuire à l’eau bouillante salée 15 minutes.' },
      { kind: 'item', text: 'Égoutter puis mixer avec le beurre et la crème liquide. Rectifier l’assaisonnement.' },
      { kind: 'heading', text: 'Cuisson du cabillaud' },
      { kind: 'item', text: 'Mixer la chapelure avec le persil, le cerfeuil, l’ail et un filet d’huile d’olive.' },
      { kind: 'item', text: 'Déposer les dos de cabillaud dans un plat huilé, recouvrir de la croûte d’herbes.' },
      { kind: 'item', text: 'Cuire 15 à 18 minutes au four préchauffé à 180°C jusqu’à dorure.' },
    ],
    ingredients: [
      { heading: 'Poisson' },
      { name: 'Dos de cabillaud', quantity: '4', unit: 'filet', note: 'environ 150g chacun' },
      { name: 'Chapelure', quantity: '50', unit: 'g' },
      { name: 'Persil frais', quantity: '0.5', unit: 'botte' },
      { name: 'Cerfeuil', quantity: '2', unit: 'c. à soupe', note: 'ciselé' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
      { heading: 'Purée' },
      { name: 'Panais', quantity: '600', unit: 'g' },
      { name: 'Beurre demi-sel', quantity: '30', unit: 'g' },
      { name: 'Crème liquide', quantity: '5', unit: 'cl' },
    ],
  },
  {
    title: 'Blanquette de veau à l’ancienne et riz pilaf',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 90,
    tags: ['Plat complet', 'Viande', 'Mijoté', 'Traditionnel'],
    instructions: [
      { kind: 'heading', text: 'Cuisson de la viande et du bouillon' },
      { kind: 'item', text: 'Placer les morceaux de veau dans une cocotte d’eau froide, porter à ébullition et écumer soigneusement.' },
      { kind: 'item', text: 'Ajouter les carottes coupées en rondelles, le poireau, l’oignon piqué d’un clou de girofle et le bouquet garni.' },
      { kind: 'item', text: 'Laisser frémir à couvert pendant 1h15 à feu doux.' },
      { kind: 'heading', text: 'Sauce et finition' },
      { kind: 'item', text: 'Préparer un roux blanc avec le beurre et la farine, puis mouiller avec 75 cl de bouillon filtré.' },
      { kind: 'item', text: 'Ajouter les champignons de Paris revenus à part. Fouetter le jaune d’œuf avec la crème fraîche et lier la sauce hors du feu.' },
      { kind: 'item', text: 'Napper la viande et servir immédiatement avec un riz pilaf bien chaud.' },
    ],
    ingredients: [
      { heading: 'Viande et garniture aromatique' },
      { name: 'Épaule de veau', quantity: '1.2', unit: 'kg', note: 'coupée en morceaux' },
      { name: 'Carottes', quantity: '4', unit: 'pièce' },
      { name: 'Blanc de poireau', quantity: '1', unit: 'pièce' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Bouquet garni', quantity: '1', unit: 'pièce' },
      { name: 'Champignons de Paris', quantity: '250', unit: 'g' },
      { heading: 'Sauce veloutée' },
      { name: 'Beurre doux', quantity: '40', unit: 'g' },
      { name: 'Farine de blé', quantity: '40', unit: 'g' },
      { name: 'Crème fraîche épaisse', quantity: '15', unit: 'cl' },
      { name: 'Jaune d’œuf', quantity: '1', unit: 'pièce' },
      { name: 'Jus de citron', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Gratin dauphinois traditionnel à l’ail et crème',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 75,
    tags: ['Légumes', 'Four', 'Accompagnement', 'Traditionnel'],
    instructions: [
      { kind: 'item', text: 'Éplucher les pommes de terre et les émincer finement à la mandoline sans les rincer pour garder l’amidon.' },
      { kind: 'item', text: 'Frotter un plat à gratin avec une gousse d’ail coupée en deux puis beurrer généreusement le plat.' },
      { kind: 'item', text: 'Faire chauffer le lait et la crème avec la muscade, le sel et le poivre.' },
      { kind: 'item', text: 'Disposer les rondelles de pommes de terre en couches régulières dans le plat.' },
      { kind: 'item', text: 'Verser le mélange chaud crème-lait sur les pommes de terre.' },
      { kind: 'item', text: 'Enfourner à 160°C pendant 1h15 jusqu’à ce que le gratin soit fondant et doré.' },
    ],
    ingredients: [
      { name: 'Pommes de terre (Charlotte ou Monalisa)', quantity: '1.2', unit: 'kg' },
      { name: 'Crème liquide entière', quantity: '40', unit: 'cl' },
      { name: 'Lait entier', quantity: '25', unit: 'cl' },
      { name: 'Gousse d’ail', quantity: '2', unit: 'gousse' },
      { name: 'Beurre doux', quantity: '20', unit: 'g' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
      { name: 'Sel fin', quantity: '1', unit: 'c. à café' },
      { name: 'Poivre noir', quantity: '1', unit: 'tour de moulin' },
    ],
  },
  {
    title: 'Saumon rôti au miel, sauce soja et sésame doré',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 12,
    tags: ['Poisson', 'Rapide', 'Four'],
    instructions: [
      { kind: 'heading', text: 'Marinade' },
      { kind: 'item', text: 'Mélanger le miel, la sauce soja, l’huile de sésame et le gingembre râpé dans un bol.' },
      { kind: 'item', text: 'Badigeonner les pavés de saumon avec la marinade et laisser reposer 10 minutes.' },
      { kind: 'heading', text: 'Cuisson' },
      { kind: 'item', text: 'Déposer les pavés dans un plat allant au four chemisé de papier cuisson.' },
      { kind: 'item', text: 'Parsemer de graines de sésame et cuire au four à 200°C pendant 12 minutes.' },
      { kind: 'item', text: 'Servir avec un riz basmati et des ciboules émincées.' },
    ],
    ingredients: [
      { name: 'Pavés de saumon', quantity: '4', unit: 'pièce', note: 'frais' },
      { name: 'Sauce soja', quantity: '3', unit: 'c. à soupe' },
      { name: 'Miel liquide', quantity: '2', unit: 'c. à soupe' },
      { name: 'Huile de sésame', quantity: '1', unit: 'c. à café' },
      { name: 'Graines de sésame', quantity: '1', unit: 'c. à soupe' },
      { name: 'Gingembre frais', quantity: '1', unit: 'c. à café', note: 'râpé' },
    ],
  },
  {
    title: 'Quiche lorraine croustillante aux lardons fumés',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 40,
    tags: ['Tarte salée', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Foncer un moule à tarte avec la pâte brisée et piquer le fond avec une fourchette.' },
      { kind: 'item', text: 'Faire dorer les lardons à la poêle à sec puis les égoutter sur du papier absorbant.' },
      { kind: 'item', text: 'Fouetter les œufs entiers avec la crème fraîche, le lait, la muscade, le poivre et une pincée de sel.' },
      { kind: 'item', text: 'Répartir les lardons tiédis sur le fond de pâte, puis verser l’appareil à quiche.' },
      { kind: 'item', text: 'Cuire à 180°C pendant 35 à 40 minutes jusqu’à ce que le dessus soit bien doré.' },
    ],
    ingredients: [
      { name: 'Pâte brisée pur beurre', quantity: '1', unit: 'rouleau' },
      { name: 'Lardons fumés', quantity: '200', unit: 'g' },
      { name: 'Œufs frais', quantity: '3', unit: 'pièce' },
      { name: 'Crème fraîche épaisse', quantity: '20', unit: 'cl' },
      { name: 'Lait demi-écrémé', quantity: '10', unit: 'cl' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
      { name: 'Poivre noir', quantity: '1', unit: 'tour de moulin' },
    ],
  },
  {
    title: 'Tarte fine aux tomates anciennes, moutarde à l’ancienne et comté',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Tarte salée', 'Végétarien', 'Été', 'Four'],
    instructions: [
      { kind: 'item', text: 'Dérouler la pâte feuilletée sur une plaque de cuisson.' },
      { kind: 'item', text: 'Tartiner le fond de pâte avec la moutarde à l’ancienne en laissant un bord de 1 cm.' },
      { kind: 'item', text: 'Parsemer la moitié du comté râpé sur la moutarde.' },
      { kind: 'item', text: 'Laver et trancher finement les tomates variées, les disposer harmonieusement en rosace.' },
      { kind: 'item', text: 'Arroser d’un filet d’huile d’olive, saupoudrer d’origan, de fleur de sel et du reste de comté.' },
      { kind: 'item', text: 'Enfourner à 200°C pendant 25 minutes jusqu’à ce que la pâte soit bien croustillante.' },
    ],
    ingredients: [
      { name: 'Pâte feuilletée pur beurre', quantity: '1', unit: 'rouleau' },
      { name: 'Tomates anciennes variées', quantity: '4', unit: 'pièce', note: 'cœur de bœuf, ananas, noire de Crimée' },
      { name: 'Moutarde à l’ancienne', quantity: '2', unit: 'c. à soupe' },
      { name: 'Comté râpé', quantity: '70', unit: 'g' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
      { name: 'Origan séché', quantity: '1', unit: 'c. à café' },
      { name: 'Fleur de sel', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Bœuf bourguignon fondant aux carottes et lardons',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 180,
    tags: ['Plat complet', 'Viande', 'Mijoté', 'Traditionnel'],
    instructions: [
      { kind: 'item', text: 'Couper la viande de bœuf en gros cubes réguliers.' },
      { kind: 'item', text: 'Dans une grande cocotte en fonte, faire rissoler les lardons et réserver.' },
      { kind: 'item', text: 'Faire dorer les morceaux de viande de tous côtés dans la graisse résiduelle, puis saupoudrer de farine (singer).' },
      { kind: 'item', text: 'Ajouter l’oignon émincé, les gousses d’ail écrasées et les carottes en grosses rondelles.' },
      { kind: 'item', text: 'Remettre les lardons, verser le vin rouge et le bouillon de bœuf pour couvrir la viande.' },
      { kind: 'item', text: 'Ajouter le bouquet garni, couvrir et laisser mijoter à feu très doux pendant 3 heures.' },
      { kind: 'item', text: 'Ajouter les petits champignons poêlés 20 minutes avant la fin de la cuisson.' },
    ],
    ingredients: [
      { name: 'Paleron ou macreuse de bœuf', quantity: '1.2', unit: 'kg' },
      { name: 'Vin rouge de Bourgogne', quantity: '75', unit: 'cl' },
      { name: 'Lardons fumés', quantity: '150', unit: 'g' },
      { name: 'Carottes', quantity: '4', unit: 'pièce' },
      { name: 'Oignons', quantity: '2', unit: 'pièce' },
      { name: 'Champignons de Paris', quantity: '250', unit: 'g' },
      { name: 'Farine de blé', quantity: '2', unit: 'c. à soupe' },
      { name: 'Bouillon de bœuf', quantity: '30', unit: 'cl' },
      { name: 'Bouquet garni', quantity: '1', unit: 'pièce' },
    ],
  },
  {
    title: 'Velouté de potimarron rôti, noisettes torréfiées et pointe de châtaigne',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    tags: ['Soupe', 'Légumes', 'Végétarien', 'Automne'],
    instructions: [
      { kind: 'item', text: 'Laver le potimarron, retirer les graines et le couper en cubes (la peau est comestible).' },
      { kind: 'item', text: 'Faire suer l’échalote dans un faitout avec une noix de beurre.' },
      { kind: 'item', text: 'Ajouter les dés de potimarron, les châtaignes émiettées et couvrir avec le bouillon de légumes.' },
      { kind: 'item', text: 'Laisser frémir 25 minutes jusqu’à ce que le potimarron soit très tendre.' },
      { kind: 'item', text: 'Mixer finement en ajoutant la crème fraîche, saler et poivrer.' },
      { kind: 'item', text: 'Servir chaud parsemé de noisettes concassées torréfiées à sec.' },
    ],
    ingredients: [
      { name: 'Potimarron bio', quantity: '800', unit: 'g' },
      { name: 'Châtaignes cuites', quantity: '100', unit: 'g' },
      { name: 'Échalotes', quantity: '2', unit: 'pièce' },
      { name: 'Bouillon de légumes', quantity: '80', unit: 'cl' },
      { name: 'Crème fraîche liquide', quantity: '10', unit: 'cl' },
      { name: 'Noisettes', quantity: '30', unit: 'g', note: 'concassées' },
      { name: 'Beurre doux', quantity: '15', unit: 'g' },
    ],
  },
  {
    title: 'Ratatouille provençale mijotée à l’huile d’olive',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 45,
    tags: ['Légumes', 'Végétarien', 'Été', 'Mijoté'],
    instructions: [
      { kind: 'item', text: 'Couper les aubergines, les courgettes et les poivrons en dés réguliers.' },
      { kind: 'item', text: 'Faire revenir chaque légume séparément dans de l’huile d’olive pour préserver les textures.' },
      { kind: 'item', text: 'Faire suer les oignons et l’ail haché dans une grande cocotte.' },
      { kind: 'item', text: 'Ajouter les tomates concassées, puis réunir tous les légumes revenus.' },
      { kind: 'item', text: 'Ajouter le thym, le laurier, du sel et du poivre. Laisser compoter à feu doux 35 minutes.' },
    ],
    ingredients: [
      { name: 'Courgettes', quantity: '2', unit: 'pièce' },
      { name: 'Aubergines', quantity: '2', unit: 'pièce' },
      { name: 'Poivron rouge', quantity: '1', unit: 'pièce' },
      { name: 'Poivron vert', quantity: '1', unit: 'pièce' },
      { name: 'Tomates mûres', quantity: '4', unit: 'pièce' },
      { name: 'Oignon rouge', quantity: '1', unit: 'pièce' },
      { name: 'Gousses d’ail', quantity: '3', unit: 'gousse' },
      { name: 'Huile d’olive', quantity: '5', unit: 'c. à soupe' },
      { name: 'Thym frais', quantity: '3', unit: 'branche' },
    ],
  },
  {
    title: 'Risotto crémeux aux champignons de Paris et parmesan',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Féculents', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Maintenir le bouillon de volaille ou de légumes au chaud sur feu doux.' },
      { kind: 'item', text: 'Faire dorer les champignons émincés dans un filet d’huile d’olive, réserver.' },
      { kind: 'item', text: 'Dans une sauteuse, faire suer l’échalote ciselée dans le beurre, ajouter le riz arborio et nacrer 2 minutes.' },
      { kind: 'item', text: 'Déglacer avec le vin blanc sec et laisser évaporer.' },
      { kind: 'item', text: 'Verser le bouillon louche après louche en remuant constamment jusqu’à absorption (environ 18 minutes).' },
      { kind: 'item', text: 'Hors du feu, incorporer les champignons, le parmesan râpé et une noix de beurre (mantecatura).' },
    ],
    ingredients: [
      { name: 'Riz arborio', quantity: '320', unit: 'g' },
      { name: 'Champignons de Paris', quantity: '300', unit: 'g' },
      { name: 'Échalotes', quantity: '2', unit: 'pièce' },
      { name: 'Vin blanc sec', quantity: '10', unit: 'cl' },
      { name: 'Bouillon de volaille ou légumes', quantity: '1', unit: 'l' },
      { name: 'Parmesan râpé (Parmigiano Reggiano)', quantity: '60', unit: 'g' },
      { name: 'Beurre doux', quantity: '40', unit: 'g' },
    ],
  },
  {
    title: 'Curry doux de pois chiches, épinards et lait de coco',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Plat complet', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Émincer l’oignon et râper le gingembre et l’ail.' },
      { kind: 'item', text: 'Faire chauffer l’huile dans une sauteuse et faire revenir le mélange oignon-ail-gingembre avec la poudre de curry et le cumin.' },
      { kind: 'item', text: 'Ajouter les tomates concassées et les pois chiches rincés et égouttés.' },
      { kind: 'item', text: 'Verser le lait de coco et laisser mijoter 15 minutes.' },
      { kind: 'item', text: 'Ajouter les jeunes pousses d’épinards en fin de cuisson pour qu’elles tombent délicatement.' },
      { kind: 'item', text: 'Arroser de jus de citron vert avant de servir avec du riz basmati.' },
    ],
    ingredients: [
      { name: 'Pois chiches cuits en conserve', quantity: '400', unit: 'g' },
      { name: 'Pousses d’épinards frais', quantity: '200', unit: 'g' },
      { name: 'Lait de coco', quantity: '40', unit: 'cl' },
      { name: 'Tomates concassées', quantity: '400', unit: 'g' },
      { name: 'Curry en poudre', quantity: '2', unit: 'c. à café' },
      { name: 'Gingembre frais', quantity: '1', unit: 'c. à café', note: 'râpé' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Citron vert', quantity: '1', unit: 'pièce' },
    ],
  },
  {
    title: 'Côtes de porc caramélisées à la moutarde et au miel',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 15,
    tags: ['Viande', 'Poêle', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Mélanger dans un ramequin la moutarde de Dijon, le miel et une cuillère à soupe d’eau tiède.' },
      { kind: 'item', text: 'Saisir les côtes de porc dans une poêle chaude avec un peu d’huile et de beurre 4 minutes par face.' },
      { kind: 'item', text: 'Baisser le feu, verser la sauce au miel et moutarde sur la viande.' },
      { kind: 'item', text: 'Laisser enrober et laquer les côtes en les arrosant continuellement pendant 3 minutes jusqu’à caramélisation.' },
      { kind: 'item', text: 'Servir sans attendre avec des haricots verts frais ou une écrasée de pommes de terre.' },
    ],
    ingredients: [
      { name: 'Côtes de porc', quantity: '4', unit: 'pièce', note: 'épaisses' },
      { name: 'Moutarde de Dijon', quantity: '2', unit: 'c. à soupe' },
      { name: 'Miel de fleurs', quantity: '2', unit: 'c. à soupe' },
      { name: 'Beurre demi-sel', quantity: '20', unit: 'g' },
      { name: 'Huile neutre', quantity: '1', unit: 'c. à soupe' },
      { name: 'Sel et poivre', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Papillotes de truite au citron, fenouil et aneth',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Poisson', 'Léger', 'Four'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 190°C.' },
      { kind: 'item', text: 'Émincer très finement le bulbe de fenouil à la mandoline.' },
      { kind: 'item', text: 'Sur quatre feuilles de papier cuisson, déposer un lit de fenouil émincé.' },
      { kind: 'item', text: 'Poser un filet de truite sur chaque lit de fenouil.' },
      { kind: 'item', text: 'Arroser d’un filet de jus de citron et d’huile d’olive, assaisonner de sel, poivre et brins d’aneth.' },
      { kind: 'item', text: 'Fermer hermétiquement les papillotes et enfourner pour 18 à 20 minutes.' },
    ],
    ingredients: [
      { name: 'Filets de truite d’élevage', quantity: '4', unit: 'filet' },
      { name: 'Bulbe de fenouil', quantity: '1', unit: 'pièce' },
      { name: 'Citron jaune bio', quantity: '1', unit: 'pièce' },
      { name: 'Aneth frais', quantity: '4', unit: 'branche' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
      { name: 'Fleur de sel', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Wok de bœuf mariné aux légumes croquants et gingembre',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 10,
    tags: ['Viande', 'Rapide', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Émincer le bœuf en fines lanières. Le faire mariner 15 minutes avec la sauce soja et l’huile de sésame.' },
      { kind: 'item', text: 'Tailler les carottes et la courgette en julienne, émincer les pois gourmands et l’oignon rouge.' },
      { kind: 'item', text: 'Chauffer un wok à feu très vif avec un filet d’huile, saisir le bœuf 2 minutes en remuant, puis réserver.' },
      { kind: 'item', text: 'Faire sauter les légumes 4 minutes pour les garder bien croquants avec le gingembre râpé.' },
      { kind: 'item', text: 'Remettre la viande, mélanger 1 minute pour réchauffer et servir avec des nouilles de blé.' },
    ],
    ingredients: [
      { name: 'Bavette ou rumsteck de bœuf', quantity: '500', unit: 'g' },
      { name: 'Carotte', quantity: '2', unit: 'pièce' },
      { name: 'Courgette', quantity: '1', unit: 'pièce' },
      { name: 'Pois gourmands', quantity: '150', unit: 'g' },
      { name: 'Sauce soja salée', quantity: '3', unit: 'c. à soupe' },
      { name: 'Huile de sésame', quantity: '1', unit: 'c. à soupe' },
      { name: 'Gingembre frais', quantity: '1', unit: 'morceau' },
    ],
  },
  {
    title: 'Lentilles vertes du Puy mijotées aux carottes et saucisse de Morteau',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 45,
    tags: ['Plat complet', 'Mijoté', 'Traditionnel', 'Hiver'],
    instructions: [
      { kind: 'item', text: 'Rincer les lentilles vertes à l’eau froide.' },
      { kind: 'item', text: 'Dans une cocotte, faire revenir l’oignon émincé et les carottes coupées en rondelles dans un peu d’huile.' },
      { kind: 'item', text: 'Ajouter les lentilles, le bouquet garni et couvrir largement d’eau froide non salée (le sel durcit les lentilles).' },
      { kind: 'item', text: 'Piquer la saucisse de Morteau et la déposer dans la cocotte.' },
      { kind: 'item', text: 'Porter à ébullition puis laisser frémir à couvert pendant environ 40 minutes.' },
      { kind: 'item', text: 'Saler et poivrer en fin de cuisson. Trancher la saucisse et servir bien chaud avec les lentilles fondantes.' },
    ],
    ingredients: [
      { name: 'Lentilles vertes du Puy AOP', quantity: '300', unit: 'g' },
      { name: 'Saucisse de Morteau IGP', quantity: '1', unit: 'pièce' },
      { name: 'Carottes', quantity: '3', unit: 'pièce' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Bouquet garni', quantity: '1', unit: 'pièce' },
      { name: 'Huile végétale', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Soupe à l’oignon gratinée à la baguette croustillante et emmental',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 40,
    tags: ['Soupe', 'Traditionnel', 'Hiver', 'Four'],
    instructions: [
      { kind: 'item', text: 'Peler et émincer finement les oignons.' },
      { kind: 'item', text: 'Faire fondre le beurre dans une casserole et faire caraméliser les oignons à feu moyen-doux pendant 25 minutes.' },
      { kind: 'item', text: 'Saupoudrer de farine, bien mélanger pendant 1 minute.' },
      { kind: 'item', text: 'Mouiller avec le vin blanc puis ajouter le bouillon de bœuf chaud. Laisser frémir 15 minutes.' },
      { kind: 'item', text: 'Répartir la soupe dans des bols allant au four, déposer des tranches de baguette grillée et couvrir d’emmental râpé.' },
      { kind: 'item', text: 'Faire gratiner sous le grill du four pendant 5 à 7 minutes.' },
    ],
    ingredients: [
      { name: 'Oignons jaunes', quantity: '800', unit: 'g' },
      { name: 'Beurre doux', quantity: '40', unit: 'g' },
      { name: 'Farine de blé', quantity: '1', unit: 'c. à soupe' },
      { name: 'Vin blanc sec', quantity: '10', unit: 'cl' },
      { name: 'Bouillon de bœuf', quantity: '1', unit: 'l' },
      { name: 'Baguette rassie', quantity: '8', unit: 'tranche' },
      { name: 'Emmental râpé', quantity: '120', unit: 'g' },
    ],
  },
  {
    title: 'Poulet basquaise traditionnel aux poivrons doux et piment d’Espelette',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 45,
    tags: ['Plat complet', 'Volaille', 'Mijoté', 'Traditionnel'],
    instructions: [
      { kind: 'item', text: 'Couper les poivrons en lanières et concasser les tomates mûres.' },
      { kind: 'item', text: 'Dans une cocotte, faire dorer les cuisses de poulet dans l’huile d’olive, saler et poivrer puis réserver.' },
      { kind: 'item', text: 'Dans la même cocotte, faire suer l’oignon et l’ail haché avec les poivrons pendant 10 minutes.' },
      { kind: 'item', text: 'Ajouter les tomates, le bouquet garni, le vin blanc et une pincée généreuse de piment d’Espelette.' },
      { kind: 'item', text: 'Remettre le poulet, couvrir et laisser mijoter à feu doux pendant 35 minutes.' },
      { kind: 'item', text: 'Servir accompagné d’un riz blanc de Camargue.' },
    ],
    ingredients: [
      { name: 'Cuisses de poulet', quantity: '4', unit: 'pièce' },
      { name: 'Poivrons rouges et verts', quantity: '3', unit: 'pièce' },
      { name: 'Tomates fraîches concassées', quantity: '500', unit: 'g' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Gousses d’ail', quantity: '2', unit: 'gousse' },
      { name: 'Vin blanc sec', quantity: '10', unit: 'cl' },
      { name: 'Piment d’Espelette AOP', quantity: '1', unit: 'c. à café' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Omelette baveuse aux fines herbes et champignons dorés',
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 8,
    tags: ['Œufs', 'Rapide', 'Végétarien', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Nettoyer et émincer les champignons. Les faire sauter vivement dans une poêle avec 10g de beurre.' },
      { kind: 'item', text: 'Battre les œufs à la fourchette sans trop insister, saler, poivrer et ajouter les herbes fraîches ciselées.' },
      { kind: 'item', text: 'Dans une poêle antiadhésive, faire mousser le reste de beurre sur feu vif.' },
      { kind: 'item', text: 'Verser les œufs et ramener délicatement les bords vers le centre avec une spatule.' },
      { kind: 'item', text: 'Déposer les champignons poêlés au centre, rouler l’omelette encore bien baveuse et dresser sur l’assiette.' },
    ],
    ingredients: [
      { name: 'Œufs frais de ferme', quantity: '5', unit: 'pièce' },
      { name: 'Champignons de Paris', quantity: '150', unit: 'g' },
      { name: 'Ciboulette fraîche', quantity: '1', unit: 'c. à soupe', note: 'ciselée' },
      { name: 'Persil plat', quantity: '1', unit: 'c. à soupe', note: 'haché' },
      { name: 'Beurre demi-sel', quantity: '25', unit: 'g' },
      { name: 'Sel et poivre', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Salade niçoise estivale au thon frais mi-cuit et anchois',
    servings: 4,
    prepMinutes: 25,
    cookMinutes: 10,
    tags: ['Salade', 'Poisson', 'Été', 'Sans cuisson'],
    instructions: [
      { kind: 'item', text: 'Cuire les haricots verts à l’eau bouillante pour les garder croquants, refroidir à l’eau glacée.' },
      { kind: 'item', text: 'Cuire les œufs durs (9 minutes) et les couper en quartiers.' },
      { kind: 'item', text: 'Snacker le pavé de thon frais 1 minute par face dans une poêle très chaude avec un filet d’huile, puis trancher finement.' },
      { kind: 'item', text: 'Disposer sur les assiettes : salade romaine, tomates en quartiers, concombre, haricots, poivron et oignon cébette.' },
      { kind: 'item', text: 'Ajouter les tranches de thon, les filets d’anchois et les petites olives de Nice.' },
      { kind: 'item', text: 'Arroser généreusement d’une vinaigrette à l’huile d’olive vierge extra et vinaigre de vin.' },
    ],
    ingredients: [
      { name: 'Pavé de thon frais', quantity: '350', unit: 'g' },
      { name: 'Haricots verts frais', quantity: '200', unit: 'g' },
      { name: 'Tomates mûres', quantity: '3', unit: 'pièce' },
      { name: 'Œufs', quantity: '2', unit: 'pièce' },
      { name: 'Filets d’anchois à l’huile', quantity: '8', unit: 'filet' },
      { name: 'Olives noires de Nice', quantity: '50', unit: 'g' },
      { name: 'Huile d’olive', quantity: '4', unit: 'c. à soupe' },
      { name: 'Vinaigre de vin rouge', quantity: '1.5', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Gnocchis poêlés au beurre de sauge, courge rôtie et noisettes',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Féculents', 'Végétarien', 'Automne', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Couper la courge butternut en petits dés et les rôtir 15 minutes à la poêle avec un peu d’huile.' },
      { kind: 'item', text: 'Faire cuire les gnocchis dans une grande casserole d’eau bouillante salée ; égoutter dès qu’ils remontent à la surface.' },
      { kind: 'item', text: 'Dans une poêle, faire chauffer le beurre avec les feuilles de sauge jusqu’à ce qu’il prenne une couleur noisette.' },
      { kind: 'item', text: 'Ajouter les gnocchis pour les faire dorer et croustiller.' },
      { kind: 'item', text: 'Mélanger avec les dés de courge rôtie, saler, poivrer et parsemer de copeaux de parmesan et de noisettes.' },
    ],
    ingredients: [
      { name: 'Gnocchis de pommes de terre frais', quantity: '500', unit: 'g' },
      { name: 'Courge butternut', quantity: '300', unit: 'g' },
      { name: 'Beurre doux', quantity: '50', unit: 'g' },
      { name: 'Feuilles de sauge fraîche', quantity: '10', unit: 'feuille' },
      { name: 'Parmesan en bloc', quantity: '40', unit: 'g' },
      { name: 'Noisettes entières', quantity: '25', unit: 'g' },
    ],
  },
  {
    title: 'Tagliatelles fraîches au saumon fumé, aneth et crème citronnée',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 10,
    tags: ['Féculents', 'Poisson', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Porter une grande quantité d’eau salée à ébullition pour les pâtes.' },
      { kind: 'item', text: 'Couper le saumon fumé en fines lanières.' },
      { kind: 'item', text: 'Dans une sauteuse, faire chauffer doucement la crème fraîche avec le zeste et le jus du demi-citron.' },
      { kind: 'item', text: 'Cuire les tagliatelles fraîches pendant 3 minutes, puis les égoutter en gardant 2 cuillères d’eau de cuisson.' },
      { kind: 'item', text: 'Mélanger les pâtes dans la sauce crémeuse, ajouter le saumon fumé hors du feu et l’aneth ciselé.' },
    ],
    ingredients: [
      { name: 'Tagliatelles fraîches', quantity: '400', unit: 'g' },
      { name: 'Saumon fumé de qualité', quantity: '200', unit: 'g' },
      { name: 'Crème fraîche épaisse', quantity: '20', unit: 'cl' },
      { name: 'Citron bio', quantity: '0.5', unit: 'pièce' },
      { name: 'Aneth frais', quantity: '1', unit: 'c. à soupe', note: 'ciselé' },
      { name: 'Poivre noir', quantity: '1', unit: 'tour de moulin' },
    ],
  },
  {
    title: 'Chili con carne épicé aux haricots rouges et maïs',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 60,
    tags: ['Plat complet', 'Viande', 'Mijoté', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Faire revenir l’oignon haché et les poivrons en dés dans l’huile d’olive avec l’ail.' },
      { kind: 'item', text: 'Ajouter la viande hachée et cuire en émiettant jusqu’à ce qu’elle soit dorée.' },
      { kind: 'item', text: 'Saupoudrer d’épices à chili, cumin, origan et paprika.' },
      { kind: 'item', text: 'Verser la pulpe de tomates et le bouillon, couvrir et laisser mijoter à feu doux 45 minutes.' },
      { kind: 'item', text: 'Ajouter les haricots rouges rincés et égouttés ainsi que le maïs, poursuivre la cuisson 15 minutes.' },
    ],
    ingredients: [
      { name: 'Bœuf haché pur bœuf', quantity: '600', unit: 'g' },
      { name: 'Haricots rouges en conserve', quantity: '500', unit: 'g' },
      { name: 'Tomates concassées', quantity: '800', unit: 'g' },
      { name: 'Poivron rouge', quantity: '1', unit: 'pièce' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Épices à chili', quantity: '2', unit: 'c. à café' },
      { name: 'Cumin moulu', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Cake salé aux courgettes, feta et menthe fraîche',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 45,
    tags: ['Apéro', 'Végétarien', 'Four', 'Pique-nique'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 180°C.' },
      { kind: 'item', text: 'Râper les courgettes et les presser dans un torchon propre pour retirer un maximum d’eau.' },
      { kind: 'item', text: 'Dans un saladier, fouetter les œufs avec la farine et la levure chimique.' },
      { kind: 'item', text: 'Incorporer l’huile d’olive et le lait tiédi en fouettant doucement.' },
      { kind: 'item', text: 'Ajouter les courgettes râpées, la feta émiettée et la menthe fraîche ciselée.' },
      { kind: 'item', text: 'Verser dans un moule à cake beurré et cuire 45 minutes au four.' },
    ],
    ingredients: [
      { name: 'Courgettes moyennes', quantity: '2', unit: 'pièce' },
      { name: 'Feta AOP', quantity: '150', unit: 'g' },
      { name: 'Œufs', quantity: '3', unit: 'pièce' },
      { name: 'Farine de blé', quantity: '150', unit: 'g' },
      { name: 'Levure chimique', quantity: '1', unit: 'sachet' },
      { name: 'Huile d’olive', quantity: '8', unit: 'cl' },
      { name: 'Lait', quantity: '10', unit: 'cl' },
      { name: 'Menthe fraîche', quantity: '10', unit: 'feuille' },
    ],
  },
  {
    title: 'Aubergines farcies au bœuf haché, tomates et mozzarella gratinée',
    servings: 4,
    prepMinutes: 25,
    cookMinutes: 35,
    tags: ['Plat complet', 'Viande', 'Four', 'Légumes'],
    instructions: [
      { kind: 'item', text: 'Couper les aubergines en deux dans la longueur et évider délicatement la chair en laissant un bord de 1 cm.' },
      { kind: 'item', text: 'Couper la chair en petits dés et la faire revenir avec l’oignon, l’ail et la viande hachée.' },
      { kind: 'item', text: 'Ajouter le coulis de tomates, le basilic, sel et poivre, laisser mijoter 10 minutes.' },
      { kind: 'item', text: 'Garnir les coques d’aubergines avec la farce, déposer des tranches de mozzarella sur le dessus.' },
      { kind: 'item', text: 'Disposer dans un plat à four avec un fond d’eau et enfourner 35 minutes à 190°C.' },
    ],
    ingredients: [
      { name: 'Aubergines', quantity: '2', unit: 'pièce' },
      { name: 'Viande hachée de bœuf', quantity: '350', unit: 'g' },
      { name: 'Coulis de tomates', quantity: '25', unit: 'cl' },
      { name: 'Mozzarella', quantity: '125', unit: 'g' },
      { name: 'Oignon', quantity: '1', unit: 'pièce' },
      { name: 'Gousse d’ail', quantity: '1', unit: 'gousse' },
      { name: 'Herbes de Provence', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Pâtes penne al pesto génois maison au basilic frais et pignons',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 10,
    tags: ['Féculents', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Faire dorer les pignons de pin à sec dans une petite poêle.' },
      { kind: 'item', text: 'Mixer les feuilles de basilic frais avec l’ail, les pignons dorés, le parmesan râpé et du sel.' },
      { kind: 'item', text: 'Ajouter l’huile d’olive en filet tout en continuant de mixer jusqu’à obtenir une pâte onctueuse.' },
      { kind: 'item', text: 'Faire cuire les penne al dente dans un grand volume d’eau salée.' },
      { kind: 'item', text: 'Égoutter les pâtes en gardant un demi-verre d’eau de cuisson, puis mélanger aussitôt avec le pesto frais.' },
    ],
    ingredients: [
      { name: 'Pâtes penne rigate', quantity: '400', unit: 'g' },
      { name: 'Basilic frais', quantity: '2', unit: 'botte' },
      { name: 'Pignons de pin', quantity: '35', unit: 'g' },
      { name: 'Parmigiano Reggiano râpé', quantity: '60', unit: 'g' },
      { name: 'Gousse d’ail', quantity: '1', unit: 'gousse' },
      { name: 'Huile d’olive vierge extra', quantity: '8', unit: 'cl' },
    ],
  },
  {
    title: 'Tartiflette savoyarde au reblochon fermier et pommes de terre',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 30,
    tags: ['Plat complet', 'Fromage', 'Hiver', 'Four', 'Traditionnel'],
    instructions: [
      { kind: 'item', text: 'Cuire les pommes de terre entières avec la peau à l’eau bouillante pendant 20 minutes.' },
      { kind: 'item', text: 'Pendant ce temps, faire revenir les oignons émincés et les lardons dans une poêle sans matière grasse.' },
      { kind: 'item', text: 'Déglacer avec le vin blanc sec de Savoie et laisser évaporer.' },
      { kind: 'item', text: 'Peler et couper les pommes de terre tièdes en rondelles.' },
      { kind: 'item', text: 'Dans un plat à gratin, alterner couches de pommes de terre et mélange oignons-lardons, napper de crème.' },
      { kind: 'item', text: 'Couper le reblochon en deux dans l’épaisseur et le poser sur le dessus, croûte vers le haut. Cuire 25 min à 200°C.' },
    ],
    ingredients: [
      { name: 'Pommes de terre à chair ferme', quantity: '1.2', unit: 'kg' },
      { name: 'Reblochon de Savoie AOP', quantity: '1', unit: 'pièce', note: 'environ 450g' },
      { name: 'Lardons fumés', quantity: '200', unit: 'g' },
      { name: 'Oignons jaunes', quantity: '2', unit: 'pièce' },
      { name: 'Vin blanc de Savoie', quantity: '10', unit: 'cl' },
      { name: 'Crème fraîche épaisse', quantity: '10', unit: 'cl' },
    ],
  },
  {
    title: 'Filet mignon de porc à la moutarde ancienne et crème fraîche',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    tags: ['Viande', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 190°C.' },
      { kind: 'item', text: 'Faire dorer le filet mignon entier de chaque côté dans une cocotte avec une noisette de beurre.' },
      { kind: 'item', text: 'Mélanger dans un bol la moutarde à l’ancienne, la moutarde forte et la crème fraîche.' },
      { kind: 'item', text: 'Badigeonner généreusement la viande avec cette préparation.' },
      { kind: 'item', text: 'Enfourner pour environ 25 à 30 minutes de cuisson.' },
      { kind: 'item', text: 'Trancher la viande en médaillons et servir arrosé du jus de cuisson onctueux.' },
    ],
    ingredients: [
      { name: 'Filet mignon de porc', quantity: '1', unit: 'pièce', note: 'environ 600g' },
      { name: 'Moutarde à l’ancienne', quantity: '2', unit: 'c. à soupe' },
      { name: 'Moutarde de Dijon', quantity: '1', unit: 'c. à café' },
      { name: 'Crème fraîche épaisse', quantity: '15', unit: 'cl' },
      { name: 'Échalotes', quantity: '2', unit: 'pièce' },
      { name: 'Beurre doux', quantity: '20', unit: 'g' },
    ],
  },
  {
    title: 'Tajine de poulet aux citrons confits, olives vertes et coriandre',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 50,
    tags: ['Plat complet', 'Volaille', 'Mijoté'],
    instructions: [
      { kind: 'item', text: 'Dans un plat à tajine ou une cocotte, faire dorer les morceaux de poulet dans l’huile d’olive avec l’oignon haché.' },
      { kind: 'item', text: 'Ajouter les épices (gingembre, curcuma, cannelle, safran ou ras-el-hanout) et l’ail écrasé.' },
      { kind: 'item', text: 'Mouiller avec un verre d’eau, couvrir et laisser mijoter à feu doux 30 minutes.' },
      { kind: 'item', text: 'Ajouter les écorces de citron confit coupées en lanières et les olives vertes blanchies.' },
      { kind: 'item', text: 'Poursuivre la cuisson 20 minutes jusqu’à ce que la sauce soit bien réduite, parsemer de coriandre fraîche.' },
    ],
    ingredients: [
      { name: 'Cuisses de poulet', quantity: '4', unit: 'pièce' },
      { name: 'Citron confit au sel', quantity: '1', unit: 'pièce' },
      { name: 'Olives vertes dénoyautées', quantity: '100', unit: 'g' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Curcuma moulu', quantity: '1', unit: 'c. à café' },
      { name: 'Gingembre moulu', quantity: '1', unit: 'c. à café' },
      { name: 'Coriandre fraîche', quantity: '0.5', unit: 'botte' },
    ],
  },
  {
    title: 'Velouté de carottes au cumin et lait de coco réconfortant',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Soupe', 'Légumes', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Peler et couper les carottes en rondelles fines.' },
      { kind: 'item', text: 'Faire revenir l’oignon émincé dans l’huile d’olive avec le cumin en poudre.' },
      { kind: 'item', text: 'Ajouter les carottes et couvrir avec le bouillon de légumes.' },
      { kind: 'item', text: 'Faire cuire à petits bouillons 20 minutes jusqu’à ce que les carottes soient tendres.' },
      { kind: 'item', text: 'Verser le lait de coco et mixer finement jusqu’à consistance veloutée.' },
    ],
    ingredients: [
      { name: 'Carottes', quantity: '800', unit: 'g' },
      { name: 'Lait de coco', quantity: '25', unit: 'cl' },
      { name: 'Bouillon de légumes', quantity: '70', unit: 'cl' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Cumin moulu', quantity: '1.5', unit: 'c. à café' },
      { name: 'Huile d’olive', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Pavé de merlu poêlé au beurre noisette et câpres',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 10,
    tags: ['Poisson', 'Rapide', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Sécher les pavés de merlu avec du papier absorbant, saler et poivrer légèrement la chair.' },
      { kind: 'item', text: 'Chauffer l’huile d’olive et la moitié du beurre dans une grande poêle.' },
      { kind: 'item', text: 'Saisir les pavés côté peau d’abord pendant 4 à 5 minutes pour la rendre croustillante.' },
      { kind: 'item', text: 'Retourner délicatement, ajouter le reste de beurre et les câpres.' },
      { kind: 'item', text: 'Arroser le poisson avec le beurre mousseux pendant 3 minutes, terminer par un filet de jus de citron.' },
    ],
    ingredients: [
      { name: 'Pavés de merlu blanc', quantity: '4', unit: 'pièce' },
      { name: 'Beurre doux', quantity: '40', unit: 'g' },
      { name: 'Câpres au vinaigre', quantity: '2', unit: 'c. à soupe' },
      { name: 'Citron jaune', quantity: '0.5', unit: 'pièce' },
      { name: 'Huile d’olive', quantity: '1', unit: 'c. à soupe' },
      { name: 'Persil haché', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Dahl de lentilles corail au lait de coco et épinards',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    tags: ['Plat complet', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Rincer abondamment les lentilles corail sous l’eau froide.' },
      { kind: 'item', text: 'Dans une sauteuse, faire chauffer l’huile et faire revenir l’oignon, l’ail et le gingembre avec curcuma et garam masala.' },
      { kind: 'item', text: 'Ajouter les lentilles corail, la pulpe de tomates et l’eau ou le bouillon.' },
      { kind: 'item', text: 'Laisser frémir 15 minutes en remuant régulièrement jusqu’à ce que les lentilles soient bien tendres.' },
      { kind: 'item', text: 'Verser le lait de coco et ajouter les pousses d’épinards. Cuire encore 3 minutes et servir.' },
    ],
    ingredients: [
      { name: 'Lentilles corail', quantity: '250', unit: 'g' },
      { name: 'Lait de coco', quantity: '25', unit: 'cl' },
      { name: 'Tomates concassées', quantity: '200', unit: 'g' },
      { name: 'Pousses d’épinards', quantity: '150', unit: 'g' },
      { name: 'Garam masala', quantity: '1', unit: 'c. à café' },
      { name: 'Curcuma', quantity: '1', unit: 'c. à café' },
      { name: 'Gousse d’ail', quantity: '2', unit: 'gousse' },
    ],
  },
  {
    title: 'Croque-monsieur croustillant au jambon blanc et béchamel onctueuse',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    tags: ['Plat complet', 'Four', 'Rapide', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Préparer une béchamel : faire fondre le beurre, ajouter la farine puis verser le lait petit à petit en fouettant jusqu’à épaississement. Saler, poivrer et muscader.' },
      { kind: 'item', text: 'Tartiner les tranches de pain de mie avec un peu de béchamel.' },
      { kind: 'item', text: 'Déposer une tranche de jambon et du fromage râpé sur 4 tranches, puis refermer avec les autres tranches.' },
      { kind: 'item', text: 'Napper le dessus des croque-monsieur avec le reste de béchamel et parsemer de fromage râpé.' },
      { kind: 'item', text: 'Cuire 15 minutes à 200°C pour obtenir une belle couleur dorée et gratinée.' },
    ],
    ingredients: [
      { name: 'Pain de mie de boulangerie', quantity: '8', unit: 'tranche' },
      { name: 'Jambon blanc supérieur', quantity: '4', unit: 'tranche' },
      { name: 'Fromage râpé (gruyère ou emmental)', quantity: '150', unit: 'g' },
      { name: 'Beurre doux', quantity: '30', unit: 'g' },
      { name: 'Farine de blé', quantity: '30', unit: 'g' },
      { name: 'Lait demi-écrémé', quantity: '30', unit: 'cl' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Salade tiède de lentilles du Puy au saumon fumé et ciboulette',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Salade', 'Poisson', 'Léger'],
    instructions: [
      { kind: 'item', text: 'Cuire les lentilles vertes dans un grand volume d’eau avec une feuille de laurier pendant 25 minutes.' },
      { kind: 'item', text: 'Égoutter les lentilles encore tièdes.' },
      { kind: 'item', text: 'Préparer la vinaigrette avec la moutarde, le vinaigre de cidre, l’huile de colza ou noix et l’huile d’olive.' },
      { kind: 'item', text: 'Mélanger les lentilles tièdes avec l’échalote finement ciselée et la vinaigrette.' },
      { kind: 'item', text: 'Dresser dans les assiettes, ajouter les lanières de saumon fumé et parsemer de ciboulette fraîche.' },
    ],
    ingredients: [
      { name: 'Lentilles vertes', quantity: '250', unit: 'g' },
      { name: 'Saumon fumé', quantity: '160', unit: 'g' },
      { name: 'Échalotes', quantity: '2', unit: 'pièce' },
      { name: 'Ciboulette fraîche', quantity: '1', unit: 'botte' },
      { name: 'Moutarde de Dijon', quantity: '1', unit: 'c. à café' },
      { name: 'Huile d’olive', quantity: '3', unit: 'c. à soupe' },
      { name: 'Vinaigre de cidre', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Clafoutis salé aux tomates cerises, chèvre frais et thym',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 35,
    tags: ['Entrées', 'Végétarien', 'Four', 'Été'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 180°C et beurrer un plat à gratin.' },
      { kind: 'item', text: 'Laver les tomates cerises et les disposer entières dans le fond du plat.' },
      { kind: 'item', text: 'Dans un saladier, fouetter les œufs avec la farine, puis incorporer le lait et la crème.' },
      { kind: 'item', text: 'Assaisonner de sel, poivre et feuilles de thym émiettées.' },
      { kind: 'item', text: 'Verser la pâte sur les tomates cerises et émietter la bûche de chèvre sur le dessus.' },
      { kind: 'item', text: 'Cuire 35 minutes au four jusqu’à ce que le clafoutis soit pris et doré.' },
    ],
    ingredients: [
      { name: 'Tomates cerises', quantity: '300', unit: 'g' },
      { name: 'Fromage de chèvre frais ou bûche', quantity: '150', unit: 'g' },
      { name: 'Œufs', quantity: '3', unit: 'pièce' },
      { name: 'Farine de blé', quantity: '80', unit: 'g' },
      { name: 'Lait demi-écrémé', quantity: '20', unit: 'cl' },
      { name: 'Crème liquide', quantity: '10', unit: 'cl' },
      { name: 'Thym frais', quantity: '2', unit: 'branche' },
    ],
  },
  {
    title: 'Hachis parmentier maison au bœuf braisé et purée au beurre',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 45,
    tags: ['Plat complet', 'Viande', 'Four', 'Traditionnel', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Cuire les pommes de terre épluchées dans l’eau salée, puis les écraser avec le beurre et le lait chaud.' },
      { kind: 'item', text: 'Dans une sauteuse, faire suer l’oignon et la carotte finement hachés dans un peu d’huile.' },
      { kind: 'item', text: 'Ajouter la viande de bœuf hachée, saler, poivrer, ajouter le persil et laisser dorer 10 minutes.' },
      { kind: 'item', text: 'Dans un plat à gratin beurré, étaler la couche de viande hachée bien tassée.' },
      { kind: 'item', text: 'Recouvrir avec la purée de pommes de terre, rayer la surface à la fourchette et parsemer de chapelure ou fromage.' },
      { kind: 'item', text: 'Cuire au four à 200°C pendant 30 minutes jusqu’à beau gratiné.' },
    ],
    ingredients: [
      { name: 'Pommes de terre pour purée', quantity: '1', unit: 'kg' },
      { name: 'Viande de bœuf hachée', quantity: '600', unit: 'g' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Carotte', quantity: '1', unit: 'pièce' },
      { name: 'Beurre demi-sel', quantity: '50', unit: 'g' },
      { name: 'Lait', quantity: '15', unit: 'cl' },
      { name: 'Persil frais', quantity: '2', unit: 'c. à soupe', note: 'haché' },
    ],
  },
  {
    title: 'Sardines grillées à la plancha, gros sel et filet de citron',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 8,
    tags: ['Poisson', 'Été', 'Rapide', 'Plancha'],
    instructions: [
      { kind: 'item', text: 'Écailler et vider les sardines très fraîches si nécessaire, puis les essuyer soigneusement.' },
      { kind: 'item', text: 'Badigeonner les sardines d’un filet d’huile d’olive et parsemer de gros sel marin.' },
      { kind: 'item', text: 'Chauffer une plancha ou un barbecue à feu très vif.' },
      { kind: 'item', text: 'Griller les sardines 3 à 4 minutes de chaque côté sans les manipuler trop souvent.' },
      { kind: 'item', text: 'Servir immédiatement bien chaudes avec des quartiers de citron jaune et du pain grillé.' },
    ],
    ingredients: [
      { name: 'Sardines fraîches', quantity: '800', unit: 'g' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
      { name: 'Gros sel de Guérande', quantity: '1', unit: 'c. à soupe' },
      { name: 'Citron jaune', quantity: '2', unit: 'pièce' },
    ],
  },
  {
    title: 'Soupe de poireaux et pommes de terre de grand-mère',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    tags: ['Soupe', 'Légumes', 'Végétarien', 'Hiver'],
    instructions: [
      { kind: 'item', text: 'Nettoyer soigneusement les blancs et le vert tendre des poireaux, puis les émincer.' },
      { kind: 'item', text: 'Peler et couper les pommes de terre en morceaux.' },
      { kind: 'item', text: 'Faire suer les poireaux dans une casserole avec le beurre pendant 5 minutes sans coloration.' },
      { kind: 'item', text: 'Ajouter les pommes de terre et couvrir avec 1 litre d’eau salée.' },
      { kind: 'item', text: 'Laisser cuire à petits bouillons pendant 25 minutes.' },
      { kind: 'item', text: 'Mixer selon la texture souhaitée (lisse ou avec morceaux) et ajouter une cuillère de crème avant de servir.' },
    ],
    ingredients: [
      { name: 'Poireaux', quantity: '3', unit: 'pièce' },
      { name: 'Pommes de terre', quantity: '3', unit: 'pièce' },
      { name: 'Beurre doux', quantity: '25', unit: 'g' },
      { name: 'Crème fraîche', quantity: '2', unit: 'c. à soupe' },
      { name: 'Sel et poivre', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Poulet sauté au curry madras, pommes et lait de coco',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Volaille', 'Rapide', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Couper les blancs de poulet en cubes réguliers.' },
      { kind: 'item', text: 'Peler et couper la pomme en petits dés.' },
      { kind: 'item', text: 'Faire dorer le poulet dans une sauteuse avec l’huile neutre, puis retirer la viande.' },
      { kind: 'item', text: 'Faire revenir l’oignon émincé et les dés de pomme avec la poudre de curry madras.' },
      { kind: 'item', text: 'Remettre le poulet, verser le lait de coco et laisser épaissir la sauce pendant 10 minutes.' },
    ],
    ingredients: [
      { name: 'Blancs de poulet fermier', quantity: '500', unit: 'g' },
      { name: 'Pomme (variété Golden ou Reine des reinettes)', quantity: '1', unit: 'pièce' },
      { name: 'Lait de coco', quantity: '25', unit: 'cl' },
      { name: 'Curry de Madras', quantity: '2', unit: 'c. à café' },
      { name: 'Oignon jaune', quantity: '1', unit: 'pièce' },
      { name: 'Huile neutre', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Gratin de chou-fleur crémeux à la béchamel et muscade',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    tags: ['Légumes', 'Four', 'Végétarien', 'Accompagnement'],
    instructions: [
      { kind: 'item', text: 'Détailler le chou-fleur en fleurettes et les laver.' },
      { kind: 'item', text: 'Faire cuire à la vapeur ou à l’eau bouillante salée pendant 10 minutes (il doit rester ferme).' },
      { kind: 'item', text: 'Préparer la sauce béchamel avec le beurre, la farine et le lait. Assaisonner avec sel, poivre et muscade râpée.' },
      { kind: 'item', text: 'Disposer le chou-fleur égoutté dans un plat à gratin, napper de béchamel et saupoudrer d’emmental râpé.' },
      { kind: 'item', text: 'Faire gratiner au four à 200°C pendant 20 minutes jusqu’à ce que le dessus soit bien doré.' },
    ],
    ingredients: [
      { name: 'Chou-fleur frais', quantity: '1', unit: 'pièce' },
      { name: 'Beurre doux', quantity: '35', unit: 'g' },
      { name: 'Farine de blé', quantity: '35', unit: 'g' },
      { name: 'Lait demi-écrémé', quantity: '40', unit: 'cl' },
      { name: 'Emmental râpé', quantity: '80', unit: 'g' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Shakshuka aux poivrons, tomates compotées et œufs coulants',
    servings: 3,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Œufs', 'Végétarien', 'Poêle', 'Plat complet'],
    instructions: [
      { kind: 'item', text: 'Émincer les oignons et tailler les poivrons en fines lanières.' },
      { kind: 'item', text: 'Faire revenir doucement dans une grande poêle avec l’huile d’olive pendant 10 minutes.' },
      { kind: 'item', text: 'Ajouter l’ail, le cumin, le paprika fumé et les tomates concassées.' },
      { kind: 'item', text: 'Laisser compoter à feu moyen 12 minutes jusqu’à épaississement.' },
      { kind: 'item', text: 'Creuser des petits puits dans la sauce et y casser délicatement les œufs.' },
      { kind: 'item', text: 'Couvrir et laisser cuire 4 à 5 minutes pour que le blanc fige et que le jaune reste bien coulant.' },
    ],
    ingredients: [
      { name: 'Œufs frais', quantity: '4', unit: 'pièce' },
      { name: 'Poivron rouge', quantity: '2', unit: 'pièce' },
      { name: 'Tomates concassées', quantity: '400', unit: 'g' },
      { name: 'Oignon rouge', quantity: '1', unit: 'pièce' },
      { name: 'Paprika doux ou fumé', quantity: '1', unit: 'c. à café' },
      { name: 'Cumin moulu', quantity: '1', unit: 'c. à café' },
      { name: 'Persil ou coriandre fraîche', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Steak de thon mariné au soja, sésame et tagliatelles de courgettes',
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 6,
    tags: ['Poisson', 'Rapide', 'Léger'],
    instructions: [
      { kind: 'item', text: 'Réaliser des tagliatelles de courgette à l’aide d’un économe.' },
      { kind: 'item', text: 'Faire mariner les steaks de thon 10 minutes avec la sauce soja et l’huile de sésame.' },
      { kind: 'item', text: 'Faire sauter les tagliatelles de courgette 3 minutes dans une poêle avec un filet d’huile d’olive.' },
      { kind: 'item', text: 'Dans une poêle très chaude, saisir les steaks de thon 1 à 2 minutes par face pour conserver un cœur rosé.' },
      { kind: 'item', text: 'Parsemer de graines de sésame et servir avec les courgettes croquantes.' },
    ],
    ingredients: [
      { name: 'Steaks de thon albacore', quantity: '2', unit: 'pièce' },
      { name: 'Courgettes moyennes', quantity: '2', unit: 'pièce' },
      { name: 'Sauce soja', quantity: '2', unit: 'c. à soupe' },
      { name: 'Huile de sésame', quantity: '1', unit: 'c. à café' },
      { name: 'Graines de sésame', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Poêlée campagnarde de pommes de terre, champignons et lardons',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Plat complet', 'Poêle', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Peler et couper les pommes de terre en dés réguliers.' },
      { kind: 'item', text: 'Faire dorer les lardons à sec dans une grande poêle, puis les retirer.' },
      { kind: 'item', text: 'Dans la même poêle avec un filet d’huile, faire sauter les pommes de terre à feu moyen pendant 15 minutes en remuant.' },
      { kind: 'item', text: 'Ajouter les champignons de Paris émincés et l’ail écrasé, poursuivre la cuisson 8 minutes.' },
      { kind: 'item', text: 'Remettre les lardons, saler, poivrer et saupoudrer de persil frais haché avant de servir.' },
    ],
    ingredients: [
      { name: 'Pommes de terre', quantity: '800', unit: 'g' },
      { name: 'Champignons de Paris', quantity: '250', unit: 'g' },
      { name: 'Lardons fumés', quantity: '150', unit: 'g' },
      { name: 'Gousse d’ail', quantity: '2', unit: 'gousse' },
      { name: 'Persil plat', quantity: '2', unit: 'c. à soupe', note: 'haché' },
      { name: 'Huile de tournesol', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Pâtes penne aux courgettes rôties, chèvre frais et pignons dorés',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    tags: ['Féculents', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Couper les courgettes en demi-rondelles.' },
      { kind: 'item', text: 'Les faire rôtir à la poêle avec l’huile d’olive et l’ail haché jusqu’à belle coloration.' },
      { kind: 'item', text: 'Cuire les penne dans de l’eau bouillante salée, réserver une petite louche d’eau de cuisson.' },
      { kind: 'item', text: 'Égoutter les pâtes et les verser dans la poêle avec les courgettes.' },
      { kind: 'item', text: 'Ajouter le chèvre frais émietté et l’eau de cuisson pour créer une sauce liée et onctueuse.' },
      { kind: 'item', text: 'Servir immédiatement en parsemant de pignons de pin torréfiés.' },
    ],
    ingredients: [
      { name: 'Pâtes penne', quantity: '400', unit: 'g' },
      { name: 'Courgettes', quantity: '2', unit: 'pièce' },
      { name: 'Fromage de chèvre frais', quantity: '120', unit: 'g' },
      { name: 'Pignons de pin', quantity: '30', unit: 'g' },
      { name: 'Gousse d’ail', quantity: '1', unit: 'gousse' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Boulettes de bœuf moelleuses à la menthe et sauce tomate basilic',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 20,
    tags: ['Viande', 'Familial', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Dans un saladier, mélanger la viande hachée, l’œuf, la chapelure, l’ail haché et la menthe ciselée.' },
      { kind: 'item', text: 'Façonner des boulettes de la taille d’une noix.' },
      { kind: 'item', text: 'Faire dorer les boulettes dans une sauteuse avec l’huile d’olive pendant 6 à 8 minutes.' },
      { kind: 'item', text: 'Verser la pulpe de tomates, ajouter le basilic, saler et poivrer.' },
      { kind: 'item', text: 'Laisser mijoter doucement 12 minutes pour que les boulettes soient bien imprégnées.' },
    ],
    ingredients: [
      { name: 'Viande hachée de bœuf', quantity: '500', unit: 'g' },
      { name: 'Œuf', quantity: '1', unit: 'pièce' },
      { name: 'Chapelure', quantity: '40', unit: 'g' },
      { name: 'Tomates concassées', quantity: '500', unit: 'g' },
      { name: 'Menthe fraîche', quantity: '10', unit: 'feuille' },
      { name: 'Basilic', quantity: '1', unit: 'c. à soupe' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Filet de lieu noir rôti aux tomates confites et olives noires',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    tags: ['Poisson', 'Léger', 'Four'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 190°C.' },
      { kind: 'item', text: 'Disposer les filets de lieu dans un plat à four légèrement huilé.' },
      { kind: 'item', text: 'Répartir autour les tomates cerises coupées en deux et les olives noires dénoyautées.' },
      { kind: 'item', text: 'Arroser d’un généreux filet d’huile d’olive, saler, poivrer et saupoudrer d’herbes de Provence.' },
      { kind: 'item', text: 'Enfourner pour 15 minutes jusqu’à ce que le poisson soit nacré.' },
    ],
    ingredients: [
      { name: 'Filets de lieu noir', quantity: '4', unit: 'filet' },
      { name: 'Tomates cerises', quantity: '250', unit: 'g' },
      { name: 'Olives noires', quantity: '50', unit: 'g' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
      { name: 'Herbes de Provence', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Gratin de pâtes coquillettes au jambon blanc et comté fondant',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Féculents', 'Familial', 'Four', 'Enfants'],
    instructions: [
      { kind: 'item', text: 'Cuire les coquillettes dans un grand volume d’eau salée 2 minutes de moins que le temps indiqué.' },
      { kind: 'item', text: 'Égoutter les pâtes et les mélanger avec la crème fraîche, le beurre fondu et les dés de jambon.' },
      { kind: 'item', text: 'Verser la préparation dans un plat à gratin beurré.' },
      { kind: 'item', text: 'Recouvrir généreusement de comté râpé et passer au four à 200°C pendant 18 minutes.' },
    ],
    ingredients: [
      { name: 'Pâtes coquillettes', quantity: '350', unit: 'g' },
      { name: 'Jambon blanc', quantity: '4', unit: 'tranche', note: 'coupé en dés' },
      { name: 'Comté râpé', quantity: '120', unit: 'g' },
      { name: 'Crème fraîche épaisse', quantity: '15', unit: 'cl' },
      { name: 'Beurre doux', quantity: '20', unit: 'g' },
    ],
  },
  {
    title: 'Velouté vert de courgettes au fromage fondu Kiri',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    tags: ['Soupe', 'Légumes', 'Végétarien', 'Enfants'],
    instructions: [
      { kind: 'item', text: 'Laver les courgettes et les couper en rondelles sans les éplucher pour garder la couleur verte.' },
      { kind: 'item', text: 'Les déposer dans une casserole avec le cube de bouillon de volaille et couvrir d’eau à hauteur.' },
      { kind: 'item', text: 'Laisser cuire 18 minutes à frémissement.' },
      { kind: 'item', text: 'Ajouter les portions de fromage fondu Kiri ou Vache qui rit et mixer très finement.' },
    ],
    ingredients: [
      { name: 'Courgettes', quantity: '1', unit: 'kg' },
      { name: 'Fromage fondu Kiri', quantity: '4', unit: 'portion' },
      { name: 'Bouillon de volaille ou légumes', quantity: '1', unit: 'cube' },
      { name: 'Sel et poivre', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Salade grecque fraîche aux concombres, tomates, feta et origan',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 0,
    tags: ['Salade', 'Végétarien', 'Été', 'Sans cuisson'],
    instructions: [
      { kind: 'item', text: 'Couper les tomates en quartiers et le concombre en rondelles épaisses.' },
      { kind: 'item', text: 'Émincer finement l’oignon rouge et tailler le poivron vert en lanières.' },
      { kind: 'item', text: 'Réunir les légumes dans un grand plat de service avec les olives de Kalamata.' },
      { kind: 'item', text: 'Déposer le bloc de feta sur le dessus (ou en gros cubes).' },
      { kind: 'item', text: 'Arroser généreusement d’huile d’olive vierge extra, saupoudrer d’origan séché et de fleur de sel.' },
    ],
    ingredients: [
      { name: 'Tomates bien mûres', quantity: '4', unit: 'pièce' },
      { name: 'Concombre', quantity: '1', unit: 'pièce' },
      { name: 'Feta grecque AOP', quantity: '200', unit: 'g' },
      { name: 'Olives de Kalamata', quantity: '60', unit: 'g' },
      { name: 'Oignon rouge', quantity: '0.5', unit: 'pièce' },
      { name: 'Poivron vert', quantity: '1', unit: 'pièce' },
      { name: 'Huile d’olive', quantity: '4', unit: 'c. à soupe' },
      { name: 'Origan séché', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Pancakes salés aux courgettes râpées et parmesan doré',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    tags: ['Entrées', 'Végétarien', 'Rapide', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Râper les courgettes et bien les presser dans un torchon pour enlever l’eau de végétation.' },
      { kind: 'item', text: 'Dans un bol, mélanger la farine, l’œuf, le lait, la levure chimique et le parmesan râpé.' },
      { kind: 'item', text: 'Ajouter les courgettes râpées et la ciboulette ciselée, saler et poivrer.' },
      { kind: 'item', text: 'Faire chauffer une noisette de beurre dans une poêle antiadhésive.' },
      { kind: 'item', text: 'Déposer des petits tas de pâte et cuire 3 minutes de chaque côté jusqu’à belle coloration.' },
    ],
    ingredients: [
      { name: 'Courgettes', quantity: '2', unit: 'pièce' },
      { name: 'Farine de blé', quantity: '100', unit: 'g' },
      { name: 'Œuf', quantity: '1', unit: 'pièce' },
      { name: 'Lait', quantity: '8', unit: 'cl' },
      { name: 'Parmesan râpé', quantity: '40', unit: 'g' },
      { name: 'Levure chimique', quantity: '0.5', unit: 'sachet' },
      { name: 'Ciboulette', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Wok de crevettes sautées à l’ail, coriandre et citron vert',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 8,
    tags: ['Poisson', 'Rapide', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Décortiquer les crevettes en conservant la queue.' },
      { kind: 'item', text: 'Émincer les gousses d’ail et la coriandre.' },
      { kind: 'item', text: 'Chauffer un wok ou une grande poêle avec l’huile d’olive à feu très vif.' },
      { kind: 'item', text: 'Faire sauter les crevettes pendant 3 à 4 minutes jusqu’à ce qu’elles deviennent bien roses.' },
      { kind: 'item', text: 'Ajouter l’ail en fin de cuisson pour ne pas le brûler, puis déglacer avec le jus de citron vert.' },
      { kind: 'item', text: 'Parsemer de coriandre fraîche et servir sans attendre.' },
    ],
    ingredients: [
      { name: 'Crevettes crues ou cuites', quantity: '500', unit: 'g' },
      { name: 'Gousses d’ail', quantity: '3', unit: 'gousse' },
      { name: 'Citron vert', quantity: '1', unit: 'pièce' },
      { name: 'Coriandre fraîche', quantity: '0.5', unit: 'botte' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Flammekueche alsacienne traditionnelle aux oignons et lardons',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 12,
    tags: ['Tarte salée', 'Traditionnel', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à sa température maximale (240°C ou plus).' },
      { kind: 'item', text: 'Étaler la pâte le plus finement possible sur une plaque de cuisson.' },
      { kind: 'item', text: 'Mélanger dans un bol le fromage blanc égoutté et la crème fraîche avec sel, poivre et muscade.' },
      { kind: 'item', text: 'Tartiner la pâte avec ce mélange crémeux.' },
      { kind: 'item', text: 'Répartir les oignons finement émincés et les petits lardons fumés.' },
      { kind: 'item', text: 'Enfourner au bas du four pendant 10 à 12 minutes jusqu’à ce que les bords soient bien dorés et croustillants.' },
    ],
    ingredients: [
      { name: 'Pâte à pain très fine ou pâte à flammekueche', quantity: '1', unit: 'rouleau' },
      { name: 'Fromage blanc épais', quantity: '100', unit: 'g' },
      { name: 'Crème fraîche épaisse', quantity: '100', unit: 'g' },
      { name: 'Lardons fumés fins', quantity: '150', unit: 'g' },
      { name: 'Oignons blancs ou jaunes', quantity: '2', unit: 'pièce' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Curry végétarien de patates douces, lentilles et lait de coco',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 25,
    tags: ['Plat complet', 'Végétarien', 'Mijoté'],
    instructions: [
      { kind: 'item', text: 'Peler et couper la patate douce en cubes moyens.' },
      { kind: 'item', text: 'Faire dorer l’oignon dans l’huile avec la pâte de curry pendant 2 minutes.' },
      { kind: 'item', text: 'Ajouter les dés de patate douce et les lentilles blondes ou corail préalablement rincées.' },
      { kind: 'item', text: 'Verser le lait de coco et le bouillon de légumes.' },
      { kind: 'item', text: 'Couvrir et laisser mijoter à feu doux 20 minutes jusqu’à tendreté des patates douces.' },
    ],
    ingredients: [
      { name: 'Patates douces', quantity: '600', unit: 'g' },
      { name: 'Lentilles corail', quantity: '150', unit: 'g' },
      { name: 'Lait de coco', quantity: '40', unit: 'cl' },
      { name: 'Pâte de curry doux', quantity: '2', unit: 'c. à café' },
      { name: 'Bouillon de légumes', quantity: '25', unit: 'cl' },
      { name: 'Oignon rouge', quantity: '1', unit: 'pièce' },
    ],
  },
  {
    title: 'Poulet mariné au citron confit et romarin rôti au four',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 45,
    tags: ['Volaille', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Dans un plat, mélanger l’huile d’olive, l’ail haché, le romarin et le jus de citron.' },
      { kind: 'item', text: 'Enrober les morceaux de poulet et les écorces de citron confit avec cette marinade.' },
      { kind: 'item', text: 'Disposer le poulet dans un plat à rôtir avec des quartiers d’oignons.' },
      { kind: 'item', text: 'Cuire 45 minutes à 190°C en arrosant deux fois de jus de cuisson.' },
    ],
    ingredients: [
      { name: 'Cuisses de poulet fermier', quantity: '4', unit: 'pièce' },
      { name: 'Citron confit', quantity: '1', unit: 'pièce' },
      { name: 'Romarin frais', quantity: '3', unit: 'branche' },
      { name: 'Gousses d’ail', quantity: '3', unit: 'gousse' },
      { name: 'Huile d’olive', quantity: '3', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Salade de quinoa aux légumes grillés, avocat et grenade',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 15,
    tags: ['Salade', 'Végétarien', 'Léger', 'Sans gluten'],
    instructions: [
      { kind: 'item', text: 'Rincer le quinoa et le cuire 12 minutes dans deux fois son volume d’eau salée, puis laisser refroidir.' },
      { kind: 'item', text: 'Faire griller les dés de courgette et poivron à la poêle avec un filet d’huile d’olive.' },
      { kind: 'item', text: 'Couper l’avocat en cubes et extraire les graines de grenade.' },
      { kind: 'item', text: 'Mélanger le quinoa avec les légumes tiédis, l’avocat et les arilles de grenade.' },
      { kind: 'item', text: 'Assaisonner d’une vinaigrette citronnée à l’huile d’olive et menthe fraîche.' },
    ],
    ingredients: [
      { name: 'Quinoa blanc ou mélangé', quantity: '200', unit: 'g' },
      { name: 'Avocat mûr', quantity: '1', unit: 'pièce' },
      { name: 'Courgette', quantity: '1', unit: 'pièce' },
      { name: 'Grenade fraîche', quantity: '0.5', unit: 'pièce' },
      { name: 'Huile d’olive', quantity: '3', unit: 'c. à soupe' },
      { name: 'Jus de citron', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Tartine campagnarde aux champignons persillés et cantal fondu',
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 10,
    tags: ['Rapide', 'Végétarien', 'Four'],
    instructions: [
      { kind: 'item', text: 'Poêler les champignons émincés avec l’ail et le persil dans une noisette de beurre pendant 6 minutes.' },
      { kind: 'item', text: 'Frotter les grandes tranches de pain de campagne avec une gousse d’ail.' },
      { kind: 'item', text: 'Répartir la poêlée de champignons sur les tranches de pain.' },
      { kind: 'item', text: 'Couvrir de lamelles épaisses de fromage Cantal.' },
      { kind: 'item', text: 'Passer sous le grill du four pendant 5 minutes jusqu’à ce que le fromage soit délicieusement fondu.' },
    ],
    ingredients: [
      { name: 'Grandes tranches de pain de campagne', quantity: '2', unit: 'tranche' },
      { name: 'Champignons de Paris ou des bois', quantity: '250', unit: 'g' },
      { name: 'Fromage Cantal entre-deux', quantity: '80', unit: 'g' },
      { name: 'Persil plat', quantity: '1', unit: 'c. à soupe', note: 'haché' },
      { name: 'Beurre doux', quantity: '15', unit: 'g' },
    ],
  },
  {
    title: 'Cabillaud poché au lait de coco, citronnelle et gingembre',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    tags: ['Poisson', 'Léger', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Dans une sauteuse, faire chauffer le lait de coco avec le bâton de citronnelle écrasé, le gingembre râpé et le piment doux.' },
      { kind: 'item', text: 'Laisser infuser à petits frémissements pendant 8 minutes.' },
      { kind: 'item', text: 'Déposer délicatement les dos de cabillaud dans le bouillon parfumé.' },
      { kind: 'item', text: 'Pocher à feu doux pendant 7 à 8 minutes sans laisser bouillir.' },
      { kind: 'item', text: 'Servir le poisson et son bouillon avec du riz jasmin et de la coriandre fraîche.' },
    ],
    ingredients: [
      { name: 'Dos de cabillaud', quantity: '4', unit: 'filet' },
      { name: 'Lait de coco', quantity: '40', unit: 'cl' },
      { name: 'Bâton de citronnelle', quantity: '1', unit: 'pièce' },
      { name: 'Gingembre frais', quantity: '1', unit: 'morceau', note: 'râpé' },
      { name: 'Sauce nuoc-mâm', quantity: '1', unit: 'c. à soupe' },
      { name: 'Coriandre', quantity: '4', unit: 'branche' },
    ],
  },
  {
    title: 'Polenta crémeuse au parmesan et ragoût de champignons sautés',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Féculents', 'Végétarien', 'Automne'],
    instructions: [
      { kind: 'item', text: 'Porter le bouillon et le lait à ébullition dans une casserole.' },
      { kind: 'item', text: 'Verser la polenta en pluie en remuant au fouet sans discontinuer.' },
      { kind: 'item', text: 'Cuire 7 à 10 minutes à feu très doux en remuant à la cuillère en bois.' },
      { kind: 'item', text: 'Incorporer le beurre et le parmesan râpé pour obtenir une texture très onctueuse.' },
      { kind: 'item', text: 'À côté, poêler vivement les champignons avec l’échalote et le persil.' },
      { kind: 'item', text: 'Dresser la polenta dans les assiettes creuses et surmonter du ragoût de champignons.' },
    ],
    ingredients: [
      { name: 'Polenta moyenne', quantity: '200', unit: 'g' },
      { name: 'Lait entier', quantity: '40', unit: 'cl' },
      { name: 'Bouillon de légumes', quantity: '40', unit: 'cl' },
      { name: 'Parmesan râpé', quantity: '50', unit: 'g' },
      { name: 'Beurre demi-sel', quantity: '30', unit: 'g' },
      { name: 'Champignons variés', quantity: '300', unit: 'g' },
    ],
  },
  {
    title: 'Curry de légumes d’automne au potimarron et pois chiches',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 25,
    tags: ['Plat complet', 'Végétarien', 'Automne'],
    instructions: [
      { kind: 'item', text: 'Couper le potimarron non pelé en cubes et émincer l’oignon.' },
      { kind: 'item', text: 'Faire revenir l’oignon avec les épices à curry et un filet d’huile d’olive.' },
      { kind: 'item', text: 'Ajouter les dés de potimarron, les pois chiches égouttés et les tomates concassées.' },
      { kind: 'item', text: 'Verser le lait de coco et laisser mijoter 20 minutes à feu doux jusqu’à ce que le potimarron soit tendre.' },
    ],
    ingredients: [
      { name: 'Potimarron', quantity: '500', unit: 'g' },
      { name: 'Pois chiches en bocal', quantity: '300', unit: 'g' },
      { name: 'Lait de coco', quantity: '30', unit: 'cl' },
      { name: 'Tomates concassées', quantity: '300', unit: 'g' },
      { name: 'Poudre de curry', quantity: '2', unit: 'c. à café' },
    ],
  },
  {
    title: 'Brochettes de poulet mariné au yaourt, paprika et citron',
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 12,
    tags: ['Volaille', 'Été', 'Plancha', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Couper les blancs de poulet en gros cubes réguliers.' },
      { kind: 'item', text: 'Mélanger le yaourt à la grecque avec l’ail haché, le paprika, le cumin, le jus de citron et un filet d’huile d’olive.' },
      { kind: 'item', text: 'Faire mariner la viande au frais pendant au moins 30 minutes.' },
      { kind: 'item', text: 'Enfiler les morceaux de poulet sur des piques à brochette.' },
      { kind: 'item', text: 'Cuire sur la plancha ou au barbecue très chaud pendant 10 à 12 minutes en les retournant régulièrement.' },
    ],
    ingredients: [
      { name: 'Blancs de poulet', quantity: '600', unit: 'g' },
      { name: 'Yaourt à la grecque', quantity: '1', unit: 'pot', note: 'environ 125g' },
      { name: 'Paprika doux', quantity: '1.5', unit: 'c. à café' },
      { name: 'Gousse d’ail', quantity: '2', unit: 'gousse' },
      { name: 'Jus de citron', quantity: '2', unit: 'c. à soupe' },
      { name: 'Huile d’olive', quantity: '2', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Taboulé libanais traditionnel riche en persil plat, menthe et tomates',
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 0,
    tags: ['Salade', 'Végétarien', 'Été', 'Sans cuisson'],
    instructions: [
      { kind: 'item', text: 'Rincer le boulgour fin et le laisser gonfler 15 minutes dans le jus de citron pressé.' },
      { kind: 'item', text: 'Laver, sécher soigneusement et hacher très finement le persil plat au couteau (ne pas mixer pour ne pas meurtrir l’herbe).' },
      { kind: 'item', text: 'Hacher la menthe fraîche et les oignons nouveaux avec leur vert.' },
      { kind: 'item', text: 'Couper les tomates en tout petits dés réguliers.' },
      { kind: 'item', text: 'Mélanger tous les ingrédients dans un grand saladier, assaisonner avec l’huile d’olive, le sel et le poivre.' },
      { kind: 'item', text: 'Réfrigérer au moins 1 heure avant de déguster bien frais.' },
    ],
    ingredients: [
      { name: 'Persil plat frais', quantity: '3', unit: 'grosse botte' },
      { name: 'Menthe fraîche', quantity: '1', unit: 'botte' },
      { name: 'Boulgour fin', quantity: '50', unit: 'g' },
      { name: 'Tomates fermes', quantity: '4', unit: 'pièce' },
      { name: 'Oignons nouveaux ou cébettes', quantity: '3', unit: 'pièce' },
      { name: 'Jus de citron jaune', quantity: '3', unit: 'pièce' },
      { name: 'Huile d’olive vierge extra', quantity: '6', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Pavé de truite rôti sur lit de poireaux fondants à la crème',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    tags: ['Poisson', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Émincer finement les blancs de poireaux et les faire fondre doucement à la poêle avec le beurre pendant 15 minutes.' },
      { kind: 'item', text: 'Ajouter la crème fraîche, saler, poivrer et une pincée de muscade.' },
      { kind: 'item', text: 'Transvaser la fondue de poireaux dans un plat allant au four.' },
      { kind: 'item', text: 'Déposer les pavés de truite assaisonnés sur le lit de poireaux.' },
      { kind: 'item', text: 'Enfourner à 180°C pendant 15 minutes.' },
    ],
    ingredients: [
      { name: 'Pavés de truite', quantity: '4', unit: 'pièce' },
      { name: 'Poireaux', quantity: '3', unit: 'pièce' },
      { name: 'Crème fraîche épaisse', quantity: '15', unit: 'cl' },
      { name: 'Beurre demi-sel', quantity: '25', unit: 'g' },
      { name: 'Noix de muscade', quantity: '1', unit: 'pincée' },
    ],
  },
  {
    title: 'Pâtes penne à la sauce arrabbiata pimentée et ail doré',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 15,
    tags: ['Féculents', 'Végétarien', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Faire chauffer l’huile d’olive dans une sauteuse et faire revenir l’ail émincé et le piment rouge sans brûler.' },
      { kind: 'item', text: 'Ajouter la pulpe de tomates, saler et laisser mijoter à feu vif 10 minutes.' },
      { kind: 'item', text: 'Cuire les penne al dente dans l’eau bouillante salée.' },
      { kind: 'item', text: 'Mélanger les pâtes directement dans la sauce pimentée, parsemer de persil plat et servir aussitôt.' },
    ],
    ingredients: [
      { name: 'Pâtes penne rigate', quantity: '400', unit: 'g' },
      { name: 'Pulpe de tomates', quantity: '400', unit: 'g' },
      { name: 'Gousses d’ail', quantity: '3', unit: 'gousse' },
      { name: 'Piment rouge séché', quantity: '1', unit: 'c. à café', note: 'flocons' },
      { name: 'Huile d’olive', quantity: '3', unit: 'c. à soupe' },
      { name: 'Persil plat', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Salade tiède de haricots verts, magret de canard fumé et noisettes',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 12,
    tags: ['Salade', 'Entrées', 'Léger'],
    instructions: [
      { kind: 'item', text: 'Équeuter les haricots verts et les cuire à l’eau bouillante salée 10 minutes pour qu’ils restent croquants.' },
      { kind: 'item', text: 'Torréfier les noisettes concassées dans une petite poêle à sec.' },
      { kind: 'item', text: 'Préparer la vinaigrette à la moutarde et à l’huile de noisette.' },
      { kind: 'item', text: 'Mélanger les haricots encore tièdes avec la vinaigrette.' },
      { kind: 'item', text: 'Disposer sur les assiettes avec les fines tranches de magret fumé et les noisettes croquantes.' },
    ],
    ingredients: [
      { name: 'Haricots verts frais', quantity: '500', unit: 'g' },
      { name: 'Magret de canard fumé en tranches', quantity: '120', unit: 'g' },
      { name: 'Noisettes', quantity: '30', unit: 'g' },
      { name: 'Huile de noisette ou olive', quantity: '3', unit: 'c. à soupe' },
      { name: 'Vinaigre de xérès', quantity: '1', unit: 'c. à soupe' },
    ],
  },
  {
    title: 'Omelette forestière aux pleurotes, persillade et comté fruité',
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 8,
    tags: ['Œufs', 'Rapide', 'Végétarien', 'Poêle'],
    instructions: [
      { kind: 'item', text: 'Déchirer les pleurotes et les faire revenir dans une poêle bien chaude avec le beurre jusqu’à légère dorure.' },
      { kind: 'item', text: 'Ajouter l’ail et le persil hachés, saler et poivrer.' },
      { kind: 'item', text: 'Battre les œufs, saler et verser dans la poêle sur les champignons.' },
      { kind: 'item', text: 'Ajouter le comté râpé au centre, plier délicatement l’omelette et servir baveuse.' },
    ],
    ingredients: [
      { name: 'Œufs frais', quantity: '5', unit: 'pièce' },
      { name: 'Pleurotes fraîches', quantity: '150', unit: 'g' },
      { name: 'Comté râpé', quantity: '40', unit: 'g' },
      { name: 'Beurre doux', quantity: '20', unit: 'g' },
      { name: 'Persil plat', quantity: '1', unit: 'c. à soupe' },
      { name: 'Gousse d’ail', quantity: '1', unit: 'gousse' },
    ],
  },
  {
    title: 'Poulet rôti au miel, sauce soja douce et carottes glacées',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 50,
    tags: ['Volaille', 'Four', 'Familial'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 190°C.' },
      { kind: 'item', text: 'Dans un bol, mélanger le miel, la sauce soja, un filet d’huile et du gingembre râpé.' },
      { kind: 'item', text: 'Badigeonner les hauts de cuisse de poulet avec cette laque.' },
      { kind: 'item', text: 'Disposer dans un plat avec des rondelles épaisses de carottes.' },
      { kind: 'item', text: 'Enfourner pour 50 minutes en arrosant deux à trois fois avec les sucs de cuisson.' },
    ],
    ingredients: [
      { name: 'Hauts de cuisses de poulet', quantity: '4', unit: 'pièce' },
      { name: 'Carottes', quantity: '4', unit: 'pièce' },
      { name: 'Miel toutes fleurs', quantity: '2', unit: 'c. à soupe' },
      { name: 'Sauce soja', quantity: '2', unit: 'c. à soupe' },
      { name: 'Gingembre frais', quantity: '1', unit: 'c. à café' },
    ],
  },
  {
    title: 'Gratin de gnocchis à la sauce tomate, basilic et mozzarella di bufala',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    tags: ['Féculents', 'Végétarien', 'Four', 'Rapide'],
    instructions: [
      { kind: 'item', text: 'Préchauffer le four à 200°C.' },
      { kind: 'item', text: 'Faire cuire les gnocchis 2 minutes dans l’eau bouillante, égoutter.' },
      { kind: 'item', text: 'Mélanger les gnocchis avec une bonne sauce tomate au basilic.' },
      { kind: 'item', text: 'Verser dans un plat à gratin, déchirer la mozzarella par-dessus.' },
      { kind: 'item', text: 'Passer au four 18 minutes jusqu’à ce que le fromage bouillonne et soit bien doré.' },
    ],
    ingredients: [
      { name: 'Gnocchis frais', quantity: '500', unit: 'g' },
      { name: 'Sauce tomate cuisinée au basilic', quantity: '400', unit: 'g' },
      { name: 'Mozzarella di bufala', quantity: '150', unit: 'g' },
      { name: 'Parmesan', quantity: '30', unit: 'g' },
    ],
  },
  {
    title: 'Soupe paysanne aux légumes d’hiver, lard paysan et croûtons dorés',
    servings: 6,
    prepMinutes: 20,
    cookMinutes: 45,
    tags: ['Soupe', 'Traditionnel', 'Hiver', 'Plat complet'],
    instructions: [
      { kind: 'item', text: 'Tailler les carottes, les navets, le poireau et les pommes de terre en morceaux.' },
      { kind: 'item', text: 'Faire revenir les morceaux de lard paysan dans un faitout avec un peu de beurre.' },
      { kind: 'item', text: 'Ajouter les légumes, couvrir d’eau et ajouter le bouquet garni.' },
      { kind: 'item', text: 'Laisser mijoter doucement pendant 45 minutes.' },
      { kind: 'item', text: 'Servir tel quel sans mixer avec de belles tranches de pain de campagne grillées.' },
    ],
    ingredients: [
      { name: 'Poitrine de porc fumée ou lard paysan', quantity: '200', unit: 'g' },
      { name: 'Carottes', quantity: '3', unit: 'pièce' },
      { name: 'Navets', quantity: '2', unit: 'pièce' },
      { name: 'Blanc de poireau', quantity: '2', unit: 'pièce' },
      { name: 'Pommes de terre', quantity: '3', unit: 'pièce' },
      { name: 'Bouquet garni', quantity: '1', unit: 'pièce' },
    ],
  },
]

async function seedTestRecipes() {
  console.log(`[seed-test-recipes] Preparing to seed ${RECIPES_DATA.length} recipes...`)

  const householdRes = await query('SELECT id FROM "Household" LIMIT 1')
  if (householdRes.rows.length === 0) {
    throw new Error('No household found in database. Please run the base seed first.')
  }
  const householdId = householdRes.rows[0].id
  console.log(`[seed-test-recipes] Targeting household ID: ${householdId}`)

  await withTransaction(async (client) => {
    // Cache for existing ingredients, units, tags
    const ingMap = new Map<string, string>() // normalized name -> id
    const unitMap = new Map<string, string>()
    const tagMap = new Map<string, string>()

    const existingIngs = await client.query('SELECT id, "nameNormalized" FROM "Ingredient" WHERE "householdId" = $1', [householdId])
    for (const row of existingIngs.rows) {
      ingMap.set(row.nameNormalized, row.id)
    }

    const existingUnits = await client.query('SELECT id, "nameNormalized" FROM "Unit" WHERE "householdId" = $1', [householdId])
    for (const row of existingUnits.rows) {
      unitMap.set(row.nameNormalized, row.id)
    }

    const existingTags = await client.query('SELECT id, "nameNormalized" FROM "RecipeTag" WHERE "householdId" = $1', [householdId])
    for (const row of existingTags.rows) {
      tagMap.set(row.nameNormalized, row.id)
    }

    // Helper functions
    async function getOrCreateIngredient(name: string): Promise<string> {
      const trimmed = name.trim()
      const normalized = trimmed.toLowerCase()
      if (ingMap.has(normalized)) return ingMap.get(normalized)!

      const id = generateId('c')
      await client.query(
        `INSERT INTO "Ingredient" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "name" = EXCLUDED."name"`,
        [id, householdId, trimmed, normalized]
      )
      ingMap.set(normalized, id)
      return id
    }

    async function getOrCreateUnit(name: string): Promise<string> {
      const trimmed = name.trim()
      const normalized = trimmed.toLowerCase()
      if (unitMap.has(normalized)) return unitMap.get(normalized)!

      const id = generateId('c')
      await client.query(
        `INSERT INTO "Unit" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "name" = EXCLUDED."name"`,
        [id, householdId, trimmed, normalized]
      )
      unitMap.set(normalized, id)
      return id
    }

    async function getOrCreateTag(name: string): Promise<string> {
      const trimmed = name.trim()
      const normalized = trimmed.toLowerCase()
      if (tagMap.has(normalized)) return tagMap.get(normalized)!

      const id = generateId('c')
      await client.query(
        `INSERT INTO "RecipeTag" ("id", "householdId", "name", "nameNormalized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT ("householdId", "nameNormalized") DO UPDATE SET "name" = EXCLUDED."name"`,
        [id, householdId, trimmed, normalized]
      )
      tagMap.set(normalized, id)
      return id
    }

    let insertedCount = 0
    let skippedCount = 0

    for (const r of RECIPES_DATA) {
      // Check if recipe with exact same title already exists in this household
      const checkRes = await client.query(
        'SELECT id FROM "Recipe" WHERE "householdId" = $1 AND "title" = $2',
        [householdId, r.title]
      )
      if (checkRes.rows.length > 0) {
        skippedCount++
        continue
      }

      const recipeId = generateId('rc')
      await client.query(
        `INSERT INTO "Recipe" (
          "id", "householdId", "title", "status", "servings", "prepMinutes", "cookMinutes",
          "instructions", "publishedAt", "autosaveVersion", "createdAt", "updatedAt"
         ) VALUES ($1, $2, $3, 'PUBLISHED', $4, $5, $6, $7::jsonb, NOW(), 1, NOW(), NOW())`,
        [
          recipeId,
          householdId,
          r.title,
          r.servings,
          r.prepMinutes,
          r.cookMinutes,
          JSON.stringify(r.instructions),
        ]
      )

      // Insert tags
      for (const tagName of r.tags) {
        const tagId = await getOrCreateTag(tagName)
        await client.query(
          `INSERT INTO "RecipeTagOnRecipe" ("recipeId", "tagId", "createdAt")
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [recipeId, tagId]
        )
      }

      // Insert ingredient rows
      let pos = 0
      for (const ingRow of r.ingredients) {
        const rowId = generateId('row')
        if (ingRow.heading) {
          await client.query(
            `INSERT INTO "RecipeIngredientRow" (
              "id", "recipeId", "position", "kind", "heading", "createdAt", "updatedAt"
             ) VALUES ($1, $2, $3, 'HEADING', $4, NOW(), NOW())`,
            [rowId, recipeId, pos++, ingRow.heading]
          )
        } else if (ingRow.name) {
          const ingId = await getOrCreateIngredient(ingRow.name)
          const unitId = ingRow.unit ? await getOrCreateUnit(ingRow.unit) : null
          await client.query(
            `INSERT INTO "RecipeIngredientRow" (
              "id", "recipeId", "position", "kind", "ingredientId", "quantity", "unitId", "note", "createdAt", "updatedAt"
             ) VALUES ($1, $2, $3, 'ITEM', $4, $5, $6, $7, NOW(), NOW())`,
            [rowId, recipeId, pos++, ingId, ingRow.quantity || null, unitId, ingRow.note || null]
          )
        }
      }

      insertedCount++
    }

    console.log(`[seed-test-recipes] Done. Inserted: ${insertedCount}, Skipped: ${skippedCount}`)
  })
}

seedTestRecipes()
  .then(() => {
    console.log('[seed-test-recipes] Finished successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[seed-test-recipes] Error:', err)
    process.exit(1)
  })
