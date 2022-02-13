-- MariaDB dump 10.19  Distrib 10.5.12-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: blog_db
-- ------------------------------------------------------
-- Server version	10.5.12-MariaDB-0+deb11u1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Article`
--

DROP TABLE IF EXISTS `Article`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Article` (
  `idArticle` int(11) NOT NULL AUTO_INCREMENT,
  `urlidArticle` varchar(64) DEFAULT NULL,
  `abstractArticle` longtext DEFAULT NULL,
  `publicationDateArticle` date NOT NULL,
  `editDateArticle` date DEFAULT NULL,
  `pathToArticle` longtext DEFAULT NULL,
  `hiddenTagsArticle` longtext DEFAULT NULL,
  `titleArticle` longtext DEFAULT NULL,
  `isWorkInProgress` tinyint(1) NOT NULL,
  `isPublic` tinyint(1) NOT NULL,
  PRIMARY KEY (`idArticle`),
  UNIQUE KEY `idArticle_UNIQUE` (`idArticle`),
  UNIQUE KEY `URLID_UNIQUE` (`urlidArticle`)
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Article_has_Author`
--

DROP TABLE IF EXISTS `Article_has_Author`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Article_has_Author` (
  `Article_idArticle` int(11) NOT NULL,
  `Author_idAuthor` int(11) NOT NULL,
  PRIMARY KEY (`Article_idArticle`,`Author_idAuthor`),
  KEY `fk_Article_has_Author_Author1_idx` (`Author_idAuthor`),
  KEY `fk_Article_has_Author_Article1_idx` (`Article_idArticle`),
  CONSTRAINT `fk_Article_has_Author_Article1` FOREIGN KEY (`Article_idArticle`) REFERENCES `Article` (`idArticle`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_Article_has_Author_Author1` FOREIGN KEY (`Author_idAuthor`) REFERENCES `Author` (`idAuthor`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Article_has_Tag`
--

DROP TABLE IF EXISTS `Article_has_Tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Article_has_Tag` (
  `Article_idArticle` int(11) NOT NULL,
  `Tag_idTag` int(11) NOT NULL,
  PRIMARY KEY (`Article_idArticle`,`Tag_idTag`),
  KEY `fk_Article_has_Tag_Tag1_idx` (`Tag_idTag`),
  KEY `fk_Article_has_Tag_Article_idx` (`Article_idArticle`),
  CONSTRAINT `fk_Article_has_Tag_Article` FOREIGN KEY (`Article_idArticle`) REFERENCES `Article` (`idArticle`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_Article_has_Tag_Tag1` FOREIGN KEY (`Tag_idTag`) REFERENCES `Tag` (`idTag`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Author`
--

DROP TABLE IF EXISTS `Author`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Author` (
  `idAuthor` int(11) NOT NULL AUTO_INCREMENT,
  `nameAuthor` longtext DEFAULT NULL,
  `surnameAuthor` longtext DEFAULT NULL,
  `photoPathAuthor` longtext DEFAULT NULL,
  `usernameAuthor` varchar(15) NOT NULL,
  `passwordAuthor` varchar(100) NOT NULL,
  PRIMARY KEY (`idAuthor`),
  UNIQUE KEY `username_UNIQUE` (`usernameAuthor`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tag`
--

DROP TABLE IF EXISTS `Tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Tag` (
  `idTag` int(11) NOT NULL AUTO_INCREMENT,
  `nameTag` longtext DEFAULT NULL,
  PRIMARY KEY (`idTag`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-02-13 11:19:52
