---
id: ham10000-dataset
title: The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions
publisher: Tschandl P., Rosendahl C. & Kittler H. Scientific Data 5, 180161 (2018)
url: https://www.nature.com/articles/sdata2018161
license: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Excerpted; no changes to the text.
attribution: Tschandl, P., Rosendahl, C. & Kittler, H. The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. Sci Data 5, 180161 (2018). https://doi.org/10.1038/sdata.2018.161
classes: nv,mel,bkl,bcc,akiec,vasc,df
source_date: 2018-08-14
retrieved: 2026-11-13
---
## Abstract

Training of neural networks for automated diagnosis of pigmented skin lesions is hampered by the small size and lack of diversity of available datasets of dermatoscopic images. We tackle this problem by releasing the HAM10000 (“Human Against Machine with 10000 training images”) dataset. We collected dermatoscopic images from different populations acquired and stored by different modalities. Given this diversity we had to apply different acquisition and cleaning methods and developed semi-automatic workflows utilizing specifically trained neural networks. The final dataset consists of 10015 dermatoscopic images which are released as a training set for academic machine learning purposes and are publicly available through the ISIC archive. This benchmark dataset can be used for machine learning and for comparisons with human experts. Cases include a representative collection of all important diagnostic categories in the realm of pigmented lesions. More than 50% of lesions have been confirmed by pathology, while the ground truth for the rest of the cases was either follow-up, expert consensus, or confirmation by in-vivo confocal microscopy.

## Background & Summary

Dermatoscopy is a widely used diagnostic technique that improves the diagnosis of benign and malignant pigmented skin lesions in comparison to examination with the unaided eye. Dermatoscopic images are also a suitable source to train artificial neural networks to diagnose pigmented skin lesions automatically. In 1994, Binder et al. already used dermatoscopic images successfully to train an artificial neural network to differentiate melanomas, the deadliest type of skin cancer, from melanocytic nevi. Although the results were promising, the study, like most earlier studies, suffered from a small sample size and the lack of dermatoscopic images other than melanoma or nevi. Recent advances in graphics card capabilities and machine learning techniques set new benchmarks with regard to the complexity of neural networks and raised expectations that automated diagnostic systems will soon be available that diagnose all kinds of pigmented skin lesions without the need of human expertise.

Training of neural-network based diagnostic algorithms requires a large number of annotated images but the number of high quality dermatoscopic images with reliable diagnoses is limited or restricted to only a few classes of diseases.

In 2013 Mendonça et al. made 200 dermatoscopic images available as the PH2 dataset including 160 nevi and 40 melanomas. Pathology was the ground truth for melanomas but not available for most nevi. Because the set is publicly available (http://www.fc.up.pt/addi/) and includes comprehensive metadata it served as a benchmark dataset for studies of the computer diagnosis of melanoma until now.

Accompanying the book Interactive Atlas of Dermoscopy a CD-ROM is commercially available with digital versions of 1044 dermatoscopic images including 167 images of non-melanocytic lesions, and 20 images of diagnoses not covered in the HAM10000 dataset. Although this is one of the most diverse available datasets in regard to covered diagnoses, its use is probably limited because of its constrained accessibility.

The ISIC archive (https://isic-archive.com/) is a collection of multiple databases and currently includes 13786 dermatoscopic images (as of February 12th 2018). Because of permissive licensing (CC-0), well-structured availability, and large size it is currently the standard source for dermatoscopic image analysis research. It is, however, biased towards melanocytic lesions (12893 of 13786 images are nevi or melanomas). Because this portal is the most comprehensive, technically advanced, and accessible resource for digital dermatoscopy, we will provide our dataset through the ISIC archive.

Because of the limitations of available datasets, past research focused on melanocytic lesions (i.e the differentiation between melanoma and nevus) and disregarded non-melanocytic pigmented lesions although they are common in practice. The mismatch between the small diversity of available training data and the variety of real life data resulted in a moderate performance of automated diagnostic systems in the clinical setting despite excellent performance in experimental settings. Building a classifier for multiple diseases is more challenging than binary classification. Currently, reliable multi-class predictions are only available for clinical images of skin diseases but not for dermatoscopic images.

To boost the research on automated diagnosis of dermatoscopic images we released the HAM10000 (“Human Against Machine with 10000 training images”) dataset. The dataset will be provided to the participants of the ISIC 2018 classification challenge hosted by the annual MICCAI conference in Granada, Spain, but will also be available to research groups who do not participate in the challenge. Because we will also use this dataset to collect and provide information on the performance of human expert diagnosis, it could serve as benchmark set for the comparisons of humans and machines in the future. In order to provide more information to machine-learning research groups who intend to use the HAM10000 training set for research we describe the evolution and the specifics of the dataset (Fig. 1) in detail.

### Unifying pathologic diagnoses

Histopathologic diagnoses showed high variability within and between sites including typos, different dermatopathologic terminologies, multiple diagnoses per lesion or uncertain diagnoses. Cases with uncertain diagnoses and collisions were excluded except for melanomas in association with a nevus.

We unified the diagnoses and formed seven generic classes, and specifically avoided ambiguous classifications. The histopathologic expression "superficial spreading melanoma in situ, arising in a preexisting dermal nevus", for example, should only be allocated to the "melanoma" class and not to the nevus class. The seven generic classes were chosen for simplicity and in regard of the intended use as a benchmark dataset for the diagnosis of pigmented lesions by humans and machines. The seven classes covered more than 95% of all pigmented lesions examined in daily clinical practice of the two study sites. A more detailed description of the disease classes is given in the usage notes below.

## Technical Validation

If necessary, an expert dermatologist performed manual histogram correction to adjust images for visual inspection by human readers. We restricted corrections to underexposed images and images with a visible yellow or green hue and made no other adjustments. To illustrate changes, we conducted color illuminant estimations after corrections according to the grey-world assumption as shown in Fig. 3. As desired, corrections shifted yellow and green illuminants towards blue and red. We defined four different types of ground truth:

### Histopathology

Histopathologic diagnoses of excised lesions have been performed by specialized dermatopathologists. We scanned all available histopathologic slides of the current ViDIR image set for later review. We manually reviewed all images with the corresponding histopathologic diagnosis and checked for plausibility. If the histopathologic diagnosis was implausible we checked for sample mismatch and reviewed the report and reexamined the slide if necessary. We excluded cases with ambiguous histopathologic diagnoses (for example: "favor nevus but cannot rule out evolving melanoma in situ").

### Confocal

Reflectance confocal microscopy is an in-vivo imaging technique with a resolution at near-cellular level, and some facial benign keratoses were verified by this method. Most cases were included in a prospective confocal study conducted at the Department of Dermatology at the Medical University of Vienna that also included follow-up for one year.

### Follow-up

If nevi monitored by digital dermatoscopy did not show any changes during 3 follow-up visits or 1.5 years we accepted this as evidence of biologic benignity. Only nevi, but no other benign diagnoses were labeled with this type of ground-truth because dermatologists usually do not monitor dermatofibromas, seborrheic keratoses, or vascular lesions. The presence of change was assessed by author HK who has more than 20 years of experience in digital dermatoscopic follow-up.

#### Consensus

For typical benign cases without histopathology or follow-up we provide an expert-consensus rating of authors PT and HK. We applied the consensus label only if both authors independently gave the same unequivocal benign diagnosis. Lesions with this type of ground-truth were usually photographed for educational reasons and did not need further follow-up or biopsy for confirmation.

## Usage Notes

The HAM10000 training set includes pigmented lesions from different populations. The Austrian image set consists of lesions of patients referred to a tertiary European referral center specialized for early detection of melanoma in high risk groups. This group of patients often have a high number of nevi and a personal or family history of melanoma. The Australian image set includes lesions from patients of a primary care facility in a high skin cancer incidence area. Australian patients are typified by severe chronic sun damage. Chronic sun damaged skin is characterized by multiple solar lentigines and ectatic vessels, which are often present in the periphery of the target lesion. Very rarely also small angiomas and seborrheic keratoses may collide with the target lesion. We did not remove this "noise" and we also did not remove terminal hairs because it reflects the situation in clinical practice. In most cases, albeit not always, the target lesion is in the center of the image. Dermatoscopic images of both study sites were taken by different devices using polarized and non-polarized dermatoscopy. The set includes representative examples of pigmented skin lesions that are practically relevant. More than 95% of all lesion encountered during clinical practice will fall into one of the seven diagnostic categories. In practice, the task of the clinician is to differentiate between malignant and benign lesions, but also to make specific diagnoses because different malignant lesions, for example melanoma and basal cell carcinoma, may be treated in a different way and timeframe. With the exception of vascular lesions, which are pigmented by hemoglobin and not by melanin, all lesions have variants that are completely devoid of pigment (for example amelanotic melanoma). Non-pigmented lesions, which are more diverse and have a larger number of possible differential diagnoses, are not part of this set.

The following description of diagnostic categories is meant for computer scientists who are not familiar with the dermatology literature:

### akiec

Actinic Keratoses (Solar Keratoses) and Intraepithelial Carcinoma (Bowen’s disease) are common non-invasive, variants of squamous cell carcinoma that can be treated locally without surgery. Some authors regard them as precursors of squamous cell carcinomas and not as actual carcinomas. There is, however, agreement that these lesions may progress to invasive squamous cell carcinoma – which is usually not pigmented. Both neoplasms commonly show surface scaling and commonly are devoid of pigment. Actinic keratoses are more common on the face and Bowen’s disease is more common on other body sites. Because both types are induced by UV-light the surrounding skin is usually typified by severe sun damaged except in cases of Bowen’s disease that are caused by human papilloma virus infection and not by UV. Pigmented variants exist for Bowen’s disease and for actinic keratoses, and both are included in this set.

The dermatoscopic criteria of pigmented actinic keratoses and Bowen’s disease are described in detail by Zalaudek et al. and by Cameron et al..

### bcc

Basal cell carcinoma is a common variant of epithelial skin cancer that rarely metastasizes but grows destructively if untreated. It appears in different morphologic variants (flat, nodular, pigmented, cystic), which are described in more detail by Lallas et al..

### bkl

"Benign keratosis" is a generic class that includes seborrheic keratoses ("senile wart"), solar lentigo - which can be regarded a flat variant of seborrheic keratosis - and lichen-planus like keratoses (LPLK), which corresponds to a seborrheic keratosis or a solar lentigo with inflammation and regression. The three subgroups may look different dermatoscopically, but we grouped them together because they are similar biologically and often reported under the same generic term histopathologically. From a dermatoscopic view, lichen planus-like keratoses are especially challenging because they can show morphologic features mimicking melanoma and are often biopsied or excised for diagnostic reasons. The dermatoscopic appearance of seborrheic keratoses varies according to anatomic site and type.

### df

Dermatofibroma is a benign skin lesion regarded as either a benign proliferation or an inflammatory reaction to minimal trauma. The most common dermatoscopic presentation is reticular lines at the periphery with a central white patch denoting fibrosis.

### nv

Melanocytic nevi are benign neoplasms of melanocytes and appear in a myriad of variants, which all are included in our series. The variants may differ significantly from a dermatoscopic point of view. In contrast to melanoma they are usually symmetric with regard to the distribution of color and structure.

### mel

Melanoma is a malignant neoplasm derived from melanocytes that may appear in different variants. If excised in an early stage it can be cured by simple surgical excision. Melanomas can be invasive or non-invasive (in situ). We included all variants of melanoma including melanoma in situ, but did exclude non-pigmented, subungual, ocular or mucosal melanoma.

Melanomas are usually, albeit not always, chaotic, and some melanoma specific criteria depend on anatomic site.

### vasc

Vascular skin lesions in the dataset range from cherry angiomas to angiokeratomas and pyogenic granulomas. Hemorrhage is also included in this category.

Angiomas are dermatoscopically characterized by red or purple color and solid, well circumscribed structures known as red clods or lacunes.

The number of images in the datasets does not correspond to the number of unique lesions, because we also provide images of the same lesion taken at different magnifications or angles (Fig. 4), or with different cameras. This should serve as a natural data-augmentation as it shows random transformations and visualizes both general and local features.

Images in the dataset may diverge from those an end-user, especially lay persons, would provide in a real-world scenario. For example, insufficiently magnified images of small lesions or out of focus images were removed.

We used automated screening by neural networks, multiple manual reviews and cleared EXIF-data of the images to remove any potentially identifiable information. Data can thus be regarded anonymized to the best of our knowledge and the data collection was approved by the ethics review committee at the Medical University of Vienna and the University of Queensland.
