import { service } from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import { Llaves } from '../config/llaves';
import { Personas } from '../models';
import { Credenciales } from '../models/credenciales.model';
import { PersonasRepository } from '../repositories';
import { AutenticacionService } from '../services';
const fetch = require("node-fetch");

export class PersonaControlController {
  constructor(
    @repository(PersonasRepository)
    public personasRepository: PersonasRepository,
    @service(AutenticacionService)
    public servicioAutenticacion: AutenticacionService,
  ) { }

  @post("identificarPersona", {
    responses: {
      '200': {
        description: "identificación de usuarios"
      }
    }
  })
  async identificarPersona(
    @requestBody() credenciales: Credenciales
  ) {
    let p = await this.servicioAutenticacion.IdentificarPersona(credenciales.usuario, credenciales.clave);
    if (p) {
      let token = this.servicioAutenticacion.GenerarTokenJWT(p);
      return {
        datos: {
          nombre: p.Nombre,
          correo: p.Correo,
          id: p.id
        },
        tk: token
      }
    } else {
      throw new HttpErrors[401]("Datos inválidos")
    }
  }

  @post('/personas')
  @response(200, {
    description: 'Personas model instance',
    content: { 'application/json': { schema: getModelSchemaRef(Personas) } },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Personas, {
            title: 'NewPersonas',
            exclude: ['id'],
          }),
        },
      },
    })
    personas: Omit<Personas, 'id'>,
  ): Promise<Personas> {

    let clave = this.servicioAutenticacion.GenerarClave();
    let claveCifrada = this.servicioAutenticacion.CifrarClave(clave);
    personas.Clave = claveCifrada;
    let p = await this.personasRepository.create(personas);

    // notificación al usuario
    let destino = personas.Correo;
    let asunto = "Registro en la Aplicación GEEKJC";
    let contenido = `Hola ${personas.Nombre}, su usuario para ingresar a GEEKJC es: ${personas.Correo} y su contraseña es: ${clave}`;
    fetch(`${Llaves.urlServicioNotificaciones}/email?correo_destino=${destino}&asunto=${asunto}&contenido=${contenido}`)
      .then((data: any) => {
        console.log(data);
      });
    return p;
  }

  @get('/personas/count')
  @response(200, {
    description: 'Personas model count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async count(
    @param.where(Personas) where?: Where<Personas>,
  ): Promise<Count> {
    return this.personasRepository.count(where);
  }

  @get('/personas')
  @response(200, {
    description: 'Array of Personas model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Personas, { includeRelations: true }),
        },
      },
    },
  })
  async find(
    @param.filter(Personas) filter?: Filter<Personas>,
  ): Promise<Personas[]> {
    return this.personasRepository.find(filter);
  }

  @patch('/personas')
  @response(200, {
    description: 'Personas PATCH success count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Personas, { partial: true }),
        },
      },
    })
    personas: Personas,
    @param.where(Personas) where?: Where<Personas>,
  ): Promise<Count> {
    return this.personasRepository.updateAll(personas, where);
  }

  @get('/personas/{id}')
  @response(200, {
    description: 'Personas model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Personas, { includeRelations: true }),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Personas, { exclude: 'where' }) filter?: FilterExcludingWhere<Personas>
  ): Promise<Personas> {
    return this.personasRepository.findById(id, filter);
  }

  @patch('/personas/{id}')
  @response(204, {
    description: 'Personas PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Personas, { partial: true }),
        },
      },
    })
    personas: Personas,
  ): Promise<void> {
    await this.personasRepository.updateById(id, personas);
  }

  @put('/personas/{id}')
  @response(204, {
    description: 'Personas PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() personas: Personas,
  ): Promise<void> {
    await this.personasRepository.replaceById(id, personas);
  }

  @del('/personas/{id}')
  @response(204, {
    description: 'Personas DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.personasRepository.deleteById(id);
  }
}
