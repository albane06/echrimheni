/**
 * P7.12 / P0-2 — Référentiel officiel des 58 Wilayas d'Algérie.
 * Données statiques pures, multilingues (FR/AR), sans dépendance externe.
 */

export interface WilayaItem {
  code: number;
  name: string;
  nameAr: string;
  chiefTown: string;
}

export const ALGERIA_WILAYAS: readonly WilayaItem[] = [
  { code: 1, name: 'Adrar', nameAr: 'أدرار', chiefTown: 'Adrar' },
  { code: 2, name: 'Chlef', nameAr: 'الشلف', chiefTown: 'Chlef' },
  { code: 3, name: 'Laghouat', nameAr: 'الأغواط', chiefTown: 'Laghouat' },
  { code: 4, name: 'Oum El Bouaghi', nameAr: 'أم البواقي', chiefTown: 'Oum El Bouaghi' },
  { code: 5, name: 'Batna', nameAr: 'باتنة', chiefTown: 'Batna' },
  { code: 6, name: 'Béjaïa', nameAr: 'بجاية', chiefTown: 'Béjaïa' },
  { code: 7, name: 'Biskra', nameAr: 'بسكرة', chiefTown: 'Biskra' },
  { code: 8, name: 'Béchar', nameAr: 'بشار', chiefTown: 'Béchar' },
  { code: 9, name: 'Blida', nameAr: 'البليدة', chiefTown: 'Blida' },
  { code: 10, name: 'Bouira', nameAr: 'البويرة', chiefTown: 'Bouira' },
  { code: 11, name: 'Tamanrasset', nameAr: 'تمنراست', chiefTown: 'Tamanrasset' },
  { code: 12, name: 'Tébessa', nameAr: 'تبسة', chiefTown: 'Tébessa' },
  { code: 13, name: 'Tlemcen', nameAr: 'تلمسان', chiefTown: 'Tlemcen' },
  { code: 14, name: 'Tiaret', nameAr: 'تيارت', chiefTown: 'Tiaret' },
  { code: 15, name: 'Tizi Ouzou', nameAr: 'تيزي وزو', chiefTown: 'Tizi Ouzou' },
  { code: 16, name: 'Alger', nameAr: 'الجزائر', chiefTown: 'Alger-Centre' },
  { code: 17, name: 'Djelfa', nameAr: 'الجلفة', chiefTown: 'Djelfa' },
  { code: 18, name: 'Jijel', nameAr: 'جيجل', chiefTown: 'Jijel' },
  { code: 19, name: 'Sétif', nameAr: 'سطيف', chiefTown: 'Sétif' },
  { code: 20, name: 'Saïda', nameAr: 'سعيدة', chiefTown: 'Saïda' },
  { code: 21, name: 'Skikda', nameAr: 'سكيكدة', chiefTown: 'Skikda' },
  { code: 22, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', chiefTown: 'Sidi Bel Abbès' },
  { code: 23, name: 'Annaba', nameAr: 'عنابة', chiefTown: 'Annaba' },
  { code: 24, name: 'Guelma', nameAr: 'قالمة', chiefTown: 'Guelma' },
  { code: 25, name: 'Constantine', nameAr: 'قسنطينة', chiefTown: 'Constantine' },
  { code: 26, name: 'Médéa', nameAr: 'المدية', chiefTown: 'Médéa' },
  { code: 27, name: 'Mostaganem', nameAr: 'مستغانم', chiefTown: 'Mostaganem' },
  { code: 28, name: "M'Sila", nameAr: 'المسيلة', chiefTown: "M'Sila" },
  { code: 29, name: 'Mascara', nameAr: 'معسكر', chiefTown: 'Mascara' },
  { code: 30, name: 'Ouargla', nameAr: 'ورقلة', chiefTown: 'Ouargla' },
  { code: 31, name: 'Oran', nameAr: 'وهران', chiefTown: 'Oran' },
  { code: 32, name: 'El Bayadh', nameAr: 'البيض', chiefTown: 'El Bayadh' },
  { code: 33, name: 'Illizi', nameAr: 'إليزي', chiefTown: 'Illizi' },
  { code: 34, name: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج', chiefTown: 'Bordj Bou Arréridj' },
  { code: 35, name: 'Boumerdès', nameAr: 'بومرداس', chiefTown: 'Boumerdès' },
  { code: 36, name: 'El Tarf', nameAr: 'الطارف', chiefTown: 'El Tarf' },
  { code: 37, name: 'Tindouf', nameAr: 'تندوف', chiefTown: 'Tindouf' },
  { code: 38, name: 'Tissemsilt', nameAr: 'تيسمسيلت', chiefTown: 'Tissemsilt' },
  { code: 39, name: 'El Oued', nameAr: 'الوادي', chiefTown: 'El Oued' },
  { code: 40, name: 'Khenchela', nameAr: 'خنشلة', chiefTown: 'Khenchela' },
  { code: 41, name: 'Souk Ahras', nameAr: 'سوق أهراس', chiefTown: 'Souk Ahras' },
  { code: 42, name: 'Tipaza', nameAr: 'تيبازة', chiefTown: 'Tipaza' },
  { code: 43, name: 'Mila', nameAr: 'ميلة', chiefTown: 'Mila' },
  { code: 44, name: 'Aïn Defla', nameAr: 'عين الدفلى', chiefTown: 'Aïn Defla' },
  { code: 45, name: 'Naâma', nameAr: 'النعامة', chiefTown: 'Naâma' },
  { code: 46, name: 'Aïn Témouchent', nameAr: 'عين تموشنت', chiefTown: 'Aïn Témouchent' },
  { code: 47, name: 'Ghardaïa', nameAr: 'غرداية', chiefTown: 'Ghardaïa' },
  { code: 48, name: 'Relizane', nameAr: 'غليزان', chiefTown: 'Relizane' },
  { code: 49, name: 'Timimoun', nameAr: 'تيميمون', chiefTown: 'Timimoun' },
  { code: 50, name: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', chiefTown: 'Bordj Badji Mokhtar' },
  { code: 51, name: 'Ouled Djellal', nameAr: 'أولاد جلال', chiefTown: 'Ouled Djellal' },
  { code: 52, name: 'Béni Abbès', nameAr: 'بني عباس', chiefTown: 'Béni Abbès' },
  { code: 53, name: 'In Salah', nameAr: 'عين صالح', chiefTown: 'In Salah' },
  { code: 54, name: 'In Guezzam', nameAr: 'عين قزام', chiefTown: 'In Guezzam' },
  { code: 55, name: 'Touggourt', nameAr: 'تقرت', chiefTown: 'Touggourt' },
  { code: 56, name: 'Djanet', nameAr: 'جانت', chiefTown: 'Djanet' },
  { code: 57, name: "El M'Ghair", nameAr: 'المغير', chiefTown: "El M'Ghair" },
  { code: 58, name: 'El Meniaa', nameAr: 'المنيعة', chiefTown: 'El Meniaa' },
] as const;
